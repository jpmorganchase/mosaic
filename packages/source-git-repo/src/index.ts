import {
  combineLatest,
  concat,
  concatMap,
  defer,
  delay,
  from,
  ignoreElements,
  Observable,
  shareReplay,
  startWith
} from 'rxjs';
import path from 'path';
import { z } from 'zod';

import type { Page, Source } from '@jpmorganchase/mosaic-types';
import {
  fileExtensionSchema,
  credentialsSchema,
  validateMosaicSchema
} from '@jpmorganchase/mosaic-schemas';
import localFolderSource from '@jpmorganchase/mosaic-source-local-folder';

import Repo from './Repo.js';
import fromCommitChange from './fromCommitChange.js';
import buildLastModified from './buildLastModified.js';

export { Repo };
export { getWorktreeDir } from './getWorktreeDir.js';

export const schema = z.object({
  /**
   * The git repository URL without any protocol
   */
  repo: z
    .string({
      error: issue =>
        issue.input === undefined
          ? ' The repo URL is required.  Include the protocol and `.git` suffix'
          : undefined
    })
    .url()
    .endsWith('.git'),
  /**
   * Credentials used to read/write from the Repository
   * Must be in the form username:password or username:token
   * Personal Access tokens are preferred:
   * https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
   */
  credentials: credentialsSchema,
  /**
   * The git branch name to checkout
   */
  branch: z.string({
    error: issue =>
      issue.input === undefined ? ' Please provide the name of the branch to checkout' : undefined
  }),
  /**
   * The name of the git remote to use
   */
  remote: z.string({
    error: issue =>
      issue.input === undefined ? 'Please provide the name of the git remote to use' : undefined
  }),
  /**
   * The folder within the git repository that contains the docs
   */
  subfolder: z.string({
    error: issue =>
      issue.input === undefined
        ? 'Please provide the name of the folder within the repository that contains the docs'
        : undefined
  }),
  /**
   * Collection of file extensions to look for
   */
  extensions: z.tuple([fileExtensionSchema], fileExtensionSchema),
  /**
   * Add to use a folder prefix
   */
  prefixDir: z.string({
    error: issue =>
      issue.input === undefined ? 'Please provide a prefix directory name' : undefined
  }),
  /**
   * If true, repo is pulled once
   */
  disableAutoPullChanges: z.boolean().optional().default(false)
});

export type GitRepoSourceOptions = z.infer<typeof schema>;

/**
 * Module-scoped `Repo` registry, keyed by `(repoUrl, branch)`. Two
 * source configurations pointing at the same git repo + branch (a
 * common pattern when slicing one monorepo into multiple
 * `subfolder`s for distinct `prefixDir`s) share a single on-disk
 * worktree, a single `setInterval` poll, and a single buffered
 * commit-date cache. Without this, each `source` re-clones the same
 * URL into its own `.tmp/.cloned_docs/...` and runs its own
 * `git fetch` loop — multiplying both disk + RAM pressure by the
 * number of sources.
 *
 * Keyed by `repoUrl + '#' + branch` (matching `Repo`'s own `name`
 * shape minus credentials, which would be unsafe as a map key).
 */
const repoRegistry = new Map<string, Repo>();

function getRepoKey(repoUrl: string, branch: string, remote: string) {
  return `${repoUrl}#${branch}#${remote}`;
}

function getOrCreateRepo(
  credentials: string,
  remote: string,
  branch: string,
  repoUrl: string
): Repo {
  // `credentials` is intentionally excluded from the key — two configs
  // pointing at the same URL with different tokens should still share
  // a clone (the second token would just be ignored on the shared
  // `Repo`, which is the same behaviour as two `localFolderSource`s
  // reading the same path).
  const key = getRepoKey(repoUrl, branch, remote);
  let repo = repoRegistry.get(key);
  if (!repo) {
    repo = new Repo(credentials, remote, branch, repoUrl);
    repoRegistry.set(key, repo);
  }
  return repo;
}

const GitRepoSource: Source<GitRepoSourceOptions> = {
  capabilities: {
    // Backed by a Git workflow that can commit + raise a PR for
    // edited pages, so the editor surfaces Edit / New Page controls
    // when this source owns the route.
    writable: true
  },
  create(options, { serialiser, pageExtensions, schedule }): Observable<Page[]> {
    const {
      credentials,
      remote,
      branch,
      repo: repoUrl,
      prefixDir,
      extensions,
      disableAutoPullChanges
    } = validateMosaicSchema(schema, options);

    const repo = getOrCreateRepo(credentials, remote, branch, repoUrl);
    const rootDir = path.join(repo.dir, options.subfolder);

    const watchFolder$: Observable<Page[]> = localFolderSource.create(
      {
        rootDir,
        prefixDir,
        extensions
      },
      { serialiser, pageExtensions, schedule }
    );

    // Commit ticks are a *signal*, not a trigger to rebuild the
    // upstream pipeline. We deliberately do NOT `switchMap` the
    // folder source from this stream: doing so would tear down and
    // rebuild `localFolderSource` on every poll, throwing away its
    // per-file deserialise cache.
    //
    // `startWith(null)` makes `combineLatest` below fire on the very
    // first folder-source emission (before any commit has landed);
    // `shareReplay({ bufferSize: 1, refCount: true })` makes the
    // single underlying `setInterval` shared across all subscribers
    // (only one in practice, but defensive against future composition).
    const commits$ = fromCommitChange(
      repo,
      disableAutoPullChanges,
      schedule.checkIntervalMins
    ).pipe(startWith(null), shareReplay({ bufferSize: 1, refCount: true }));

    // `repo.init()` is intentionally side-effecting and value-less
    // here; we use `ignoreElements()` so the init promise gates the
    // pipeline but never emits, leaving the live stream to drive
    // page output.
    const init$ = defer(() => repo.init()).pipe(ignoreElements());

    const pages$ = combineLatest([watchFolder$, commits$]).pipe(
      // Both inputs are required, but only the `pages` side carries
      // useful data — the commit tick is just "the commit-date cache
      // is no longer authoritative for at least the changed files".
      // We rebuild `lastModified` using the bulk commit-date map (one
      // subprocess per emission) plus the per-page cache that survives
      // across emissions.
      //
      // `concatMap` preserves order and guarantees only one in-flight
      // commit-date map at a time per source — if folder + commit
      // signals coincide we don't fan out into N parallel `git log`
      // calls, we serialise them.
      concatMap(([pages]) => from(buildLastModified(repo, rootDir, prefixDir, pages)))
    );

    return concat(init$, pages$).pipe(delay(schedule.initialDelayMs));
  },
  /**
   * Fetches now instead of waiting for `checkIntervalMins`, e.g. when a push
   * webhook arrives. New commits flow through the same path as a scheduled
   * check: the worktree is reset, the folder watcher re-reads the changed
   * files and the source emits.
   */
  async refresh(options) {
    const { repo: repoUrl, branch, remote } = options;
    await repoRegistry.get(getRepoKey(repoUrl, branch, remote))?.checkForChanges();
  }
};

export default GitRepoSource;
