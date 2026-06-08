import cp from 'child_process';
import path from 'path';
import fs from 'fs/promises';

import { getCloneRootDir } from './getWorktreeDir.js';

const gitChangeType = {
  A: 'add',
  D: 'delete',
  M: 'modify',
  R: 'rename'
} as const;

export type GitChangeTypeKeys = keyof typeof gitChangeType;
export type GitChangeTypeValues = typeof gitChangeType[GitChangeTypeKeys] | 'Unknown';

export type DiffResult = Array<{
  toString: () => string;
  type: GitChangeTypeValues;
  typeCode: GitChangeTypeKeys;
  file: string;
}>;

function getProjectNameAndRepoName(repoUrl: string) {
  const [, projectNameAndRepoName] = new URL(repoUrl).pathname.match(
    /([^/]+\/[^/]+)\.git$/
  ) as RegExpMatchArray;
  const [projectName, repoName] = projectNameAndRepoName.split('/');
  return {
    projectNameAndRepoName,
    projectName,
    repoName
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Hard cap on per-stream child-process output we keep in memory. Most git
 * commands we run (`rev-parse`, `config`, `commit`, …) emit kilobytes at
 * most. The pathological cases are `fetch`/`clone`/`log` on large repos,
 * which can stream tens of MB of progress output to stderr. Without a cap
 * each chunk is `.toString()`'d (UTF-8 decoded) and concatenated into a
 * JS-heap string, growing linearly with repo activity rather than docs
 * activity. 8 MiB is comfortably bigger than any legitimate `git log`
 * output we care about (a docs subtree's history), and small enough that
 * a stuck/malformed command can't OOM the worker on its own.
 */
const MAX_SPAWN_BUFFER_BYTES = 8 * 1024 * 1024;

/**
 * Options for the in-process git wrapper. `discardStdout` is used for
 * write/network commands whose stdout we never read (`fetch`, `pull`,
 * `push`, `reset`, `add`, `commit`, `config`, `checkout`, `worktree …`).
 * Piping stdout to `'ignore'` lets the kernel drop the bytes before they
 * ever cross into Node, which is the cheapest way to make a noisy
 * `git fetch --all` invisible to the JS heap.
 */
interface SpawnOptions {
  discardStdout?: boolean;
}

function spawn(
  exe: string,
  args: string[],
  cwd: string,
  options: SpawnOptions = {}
): Promise<string> {
  const { discardStdout = false } = options;
  return new Promise<string>((resolve, reject) => {
    const child = cp.spawn(exe, args, {
      cwd,
      stdio: ['ignore', discardStdout ? 'ignore' : 'pipe', 'pipe']
    });

    let out = '';
    let err = '';
    let settled = false;

    const onStdout = (chunk: Buffer) => {
      if (out.length < MAX_SPAWN_BUFFER_BYTES) out += chunk.toString('utf8');
    };
    const onStderr = (chunk: Buffer) => {
      if (err.length < MAX_SPAWN_BUFFER_BYTES) err += chunk.toString('utf8');
    };

    const detach = () => {
      child.stdout?.off('data', onStdout);
      child.stderr?.off('data', onStderr);
    };

    if (child.stdout) child.stdout.on('data', onStdout);
    if (child.stderr) child.stderr.on('data', onStderr);

    // `error` fires for spawn-time failures (ENOENT, EACCES). These are
    // the only failures we want to surface as a rejected promise distinct
    // from a non-zero exit; everything else funnels through `close`.
    child.once('error', e => {
      if (settled) return;
      settled = true;
      detach();
      reject(e);
    });

    // We deliberately listen to `close`, not `exit`. `exit` fires when
    // the child process terminates; `close` fires after stdio streams
    // are fully flushed — which is what we need to capture all of `err`.
    // Listening to both means whichever fires last keeps the buffer
    // pinned (the listener may no-op on the settled promise, but the
    // closure that captures `out`/`err` lives until the listener does).
    child.once('close', code => {
      if (settled) return;
      settled = true;
      detach();
      if (code) {
        reject(
          new Error(`Command '${exe} ${args.join(' ')}' failed (${code}): ${(err || out).trim()}`)
        );
      } else {
        resolve(out);
      }
    });
  }).catch(e => {
    e.message = stripCredentials(e.message);
    throw e;
  });
}

async function* updatedFilesGenerator(
  repositoryAPI: InstanceType<typeof Repo>,
  disableAutoPullChanges = false
) {
  let lastSyncedRevision = await repositoryAPI.currentLocalRevision();

  while (true) {
    await repositoryAPI.fetch();
    const latestRevision = await repositoryAPI.latestRemoteRevision();

    if (
      latestRevision !== lastSyncedRevision &&
      latestRevision !== null &&
      lastSyncedRevision !== null
    ) {
      if (!disableAutoPullChanges) {
        await repositoryAPI.reset();
        const changes = await repositoryAPI.diff(lastSyncedRevision);
        // HEAD moved; everything in the per-page commit-date memo is
        // now potentially stale. Drop it so the next consumer-side
        // lookup re-reads from `git log`.
        repositoryAPI.invalidateCommitDateCache();
        if (changes.length) {
          yield changes;
          lastSyncedRevision = latestRevision;
          continue;
        }
      } else {
        repositoryAPI.invalidateCommitDateCache();
        yield [];
        lastSyncedRevision = latestRevision;
        continue;
      }
    }
    lastSyncedRevision = latestRevision;
    yield null;
  }
}

async function doesPreviousCloneExist(repo: string, dir: string) {
  try {
    if (!(await fs.stat(path.join(dir, '.git')))) {
      return false;
    }
    // Output will look something like:
    // origin	ssh://git@bitbucketdc-ssh.jpmchase.net:7999/x/x.git (fetch)
    // origin	https://github_pat_xxxxxxxx@github.com/username/reponame.git (fetch)
    const [, projectURI] = (await spawn('git', ['remote', '-v'], dir)).match(
      /\s+([^ ]+)/
    ) as RegExpMatchArray;
    return projectURI === repo;
  } catch {
    return false;
  }
}

function stripCredentials(url: string) {
  return url.replace(/(\b(ssh|https?):\/\/[^:]+?:)([^@]+)@/i, (_, $1) => `${$1}*@`);
}

function createRepoURL(repo: string, credentials: string) {
  let repoPath;
  let repoProtocol;
  try {
    const { protocol, hostname, pathname } = new URL(repo);
    repoProtocol = protocol;
    repoPath = `${hostname}${pathname}`;
  } catch {
    repoProtocol = 'https:';
    repoPath = repo;
  }
  let encodedCredentials;
  if (credentials) {
    encodedCredentials = credentials
      .split(':')
      .map(credential => encodeURIComponent(credential))
      .join(':');
  }
  const repoURL = encodedCredentials
    ? `${repoProtocol}//${encodedCredentials}@${repoPath}`
    : `${repoProtocol}//${repoPath}`;
  return repoURL;
}

export default class Repo {
  #cloned = false;
  #dir = '';
  #cloneRootDir = '';
  #worktreeRootDir = '';
  #remote = '';
  #name = '';
  #branch = '';
  #repo = '';
  #credentials: string | null = null;

  /**
   * Per-`(filepath, revision)` memo of `git log -1 -- <filepath>`. The
   * revision in the key is `HEAD` at the time the entry was inserted; we
   * invalidate the whole map whenever a new commit is observed via
   * `onCommitChange` (see {@link invalidateCommitDateCache}). This turns
   * the per-page `git log` storm in `index.ts` from O(pages * polls) into
   * O(changed-pages) once primed.
   */
  #commitDateCache: Map<string, { revision: string; date: number }> = new Map();

  constructor(credentials: string, remote = 'origin', branch: string, repo: string) {
    if (!repo) {
      throw new Error('Repo is a required option.');
    }
    if (!credentials) {
      console.warn('[Mosaic][Source-Git] No `credentials` provided for git repo request.');
    }

    this.#cloneRootDir = getCloneRootDir(repo);
    this.#worktreeRootDir = path.join(this.#cloneRootDir, '.mosaic-worktrees');
    this.#dir = path.join(this.#worktreeRootDir, branch);
    this.#remote = remote;
    this.#branch = branch;
    this.#credentials = credentials;
    this.#repo = createRepoURL(repo, credentials);

    // Hide credentials when displaying repository name
    this.#name = `${stripCredentials(this.#repo)}#${branch}`;
  }

  get name() {
    return this.#name;
  }

  get dir() {
    return this.#dir;
  }

  get projectName() {
    return getProjectNameAndRepoName(this.#repo).projectName;
  }

  get repoName() {
    return getProjectNameAndRepoName(this.#repo).repoName;
  }

  onCommitChange(
    callback: (files: DiffResult | null) => void,
    errCallback: (e: unknown) => void,
    disableAutoPullChanges: boolean,
    updateInterval: number
  ) {
    const updatedFilesGen = updatedFilesGenerator(this, disableAutoPullChanges);

    let intervalId: NodeJS.Timeout | null = setInterval(async () => {
      try {
        if (this.#cloned) {
          const { value: updatedFiles } = await updatedFilesGen.next();

          if (updatedFiles && (disableAutoPullChanges || updatedFiles.length)) {
            callback(updatedFiles);
          }
        }
      } catch (e: unknown) {
        console.warn(`[Mosaic][Source-Git] Unsubscribing from \`onCommitChange\` for ${this.name}`);
        unsubscribe();
        errCallback(e);
      }
    }, updateInterval);

    const unsubscribe = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    return unsubscribe;
  }

  async pull() {
    if (!this.#cloned) {
      throw new Error('No repository cloned. Call init() to clone the initial repository.');
    }
    return await spawn('git', ['pull', this.#remote, this.#branch], this.#dir, {
      discardStdout: true
    });
  }

  async diff(latestRevision: string): Promise<DiffResult> {
    if (!this.#cloned) {
      throw new Error('No repository cloned. Call init() to clone the initial repository.');
    }
    const diff = await spawn(
      'git',
      ['diff', `${latestRevision}..${this.#branch}`, '--name-status', '--no-renames'],
      this.#dir
    );

    if (!diff) {
      return [];
    }

    return diff
      .trim()
      .split('\n')
      .map(line => {
        const [typeCode, filePath] = line.split('\t');
        return {
          toString() {
            return this.file;
          },
          type: gitChangeType[typeCode as GitChangeTypeKeys] || 'Unknown',
          typeCode: typeCode as GitChangeTypeKeys,
          file: path.join(this.#dir, filePath)
        };
      });
  }

  reset() {
    if (!this.#cloned) {
      throw new Error('No repository cloned. Call init() to clone the initial repository.');
    }
    return spawn('git', ['reset', `${this.#remote}/${this.#branch}`, '--hard'], this.#dir, {
      discardStdout: true
    });
  }

  async hasLatestChanges() {
    if (!this.#cloned) {
      throw new Error('No repository cloned. Call init() to clone the initial repository.');
    }
    await this.fetch();
    return (await this.latestRemoteRevision()) === (await this.currentLocalRevision());
  }

  async currentLocalRevision() {
    if (!this.#cloned) {
      throw new Error('No repository cloned. Call init() to clone the initial repository.');
    }
    const result = await spawn('git', ['rev-parse', 'HEAD'], this.#dir);
    if (!result) {
      console.warn('[Mosaic][Source-Git] No revision found for HEAD');
      return null;
    }
    return result ? result.trim() : '';
  }

  async latestRemoteRevision() {
    if (!this.#cloned) {
      throw new Error('No repository cloned. Call init() to clone the initial repository.');
    }
    const result = await spawn('git', ['rev-parse', `${this.#remote}/${this.#branch}`], this.#dir);

    if (!result) {
      console.warn(`[Mosaic][Source-Git] No revision found for tag ${this.#branch}`);
      return null;
    }
    return result.trim();
  }

  getLatestCommitDate = async (page: string): Promise<number> => {
    if (!this.#cloned) {
      throw new Error('No repository cloned. Call init() to clone the initial repository.');
    }

    // Cache key is `(filepath, HEAD)`. If HEAD hasn't moved since the
    // last lookup for this file, the answer is by definition unchanged
    // — `git log -1 -- <file>` is a pure function of `(working tree at
    // HEAD, filepath)`. The whole cache is dropped by
    // `invalidateCommitDateCache()` when `updatedFilesGenerator`
    // observes a new commit, so staleness is bounded by the poll
    // interval rather than the process lifetime.
    const headRevision = await this.currentLocalRevision();
    if (headRevision) {
      const cached = this.#commitDateCache.get(page);
      if (cached && cached.revision === headRevision) {
        return cached.date;
      }
    }

    const result = await spawn('git', ['log', '-1', '--format=%ct', '--', `${page}`], this.#dir);

    let date: number;
    if (!result.trim()) {
      // No history for this path (newly created file, or path filtered
      // out by sparse spec). Fall back to "now" — same behaviour as
      // before the cache, so we don't change semantics for paths that
      // genuinely have no history.
      date = Date.now();
    } else {
      // `%ct` is committer date as a unix timestamp in seconds. The
      // previous `%ci`+`Date.parse` round-trip was ~2× the work for
      // identical output. Trim and `* 1000` and we're done.
      const seconds = Number.parseInt(result.trim(), 10);
      date = Number.isFinite(seconds) ? seconds * 1000 : Date.now();
    }

    if (headRevision) {
      this.#commitDateCache.set(page, { revision: headRevision, date });
    }
    return date;
  };

  /**
   * Bulk variant of {@link getLatestCommitDate}. A single `git log`
   * traversal yields the most-recent commit timestamp for every file
   * under `scope` (defaulting to the whole worktree). This is the
   * primer for the per-page cache: one subprocess per emission instead
   * of one per page, and the output is bounded by the *commit history*
   * of `scope`, not the page count.
   *
   * Returns paths relative to `this.dir`, matching the keys the
   * per-page `getLatestCommitDate(page)` lookup will use.
   */
  async getLatestCommitDateMap(scope?: string): Promise<Map<string, number>> {
    if (!this.#cloned) {
      throw new Error('No repository cloned. Call init() to clone the initial repository.');
    }
    const map = new Map<string, number>();
    const headRevision = await this.currentLocalRevision();

    // `--name-only` + a sentinel-prefixed format lets us walk commits in
    // history order without parsing diff stats. For each commit we emit
    // a `T<unix-seconds>` line followed by the list of paths it touched;
    // because we iterate newest-first, the *first* time we see a path is
    // the most recent commit that touched it.
    const sentinel = 'T';
    const args = ['log', `--pretty=format:${sentinel}%ct`, '--name-only', '--no-renames'];
    if (scope) {
      args.push('--', scope);
    }

    let result: string;
    try {
      result = await spawn('git', args, this.#dir);
    } catch (e) {
      // Bulk log is a perf optimisation; if it blows up (e.g. invalid
      // scope, transient I/O) we fall back to per-page lookups rather
      // than failing the whole emission.
      console.warn(
        `[Mosaic][Source-Git] getLatestCommitDateMap failed for '${scope ?? '<all>'}': ${
          (e as Error).message
        }`
      );
      return map;
    }

    let currentTs = 0;
    for (const rawLine of result.split('\n')) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line.startsWith(sentinel)) {
        const seconds = Number.parseInt(line.slice(sentinel.length), 10);
        currentTs = Number.isFinite(seconds) ? seconds * 1000 : 0;
        continue;
      }
      if (currentTs && !map.has(line)) {
        map.set(line, currentTs);
        if (headRevision) {
          this.#commitDateCache.set(line, { revision: headRevision, date: currentTs });
        }
      }
    }
    return map;
  }

  /**
   * Called by `updatedFilesGenerator` whenever a new HEAD is observed.
   * Drops the per-page commit-date memo so the next lookup re-reads.
   */
  invalidateCommitDateCache() {
    this.#commitDateCache.clear();
  }

  fetch() {
    if (!this.#cloned) {
      throw new Error('No repository cloned. Call init() to clone the initial repository.');
    }
    // `--all` pulls every remote's refs; we genuinely only have one
    // remote in practice (`origin`), so scope the fetch to it. We also
    // discard stdout: `git fetch` writes its progress (and on busy repos
    // that's MB of "Receiving objects: …" noise) to stderr, but a few
    // git transports still emit verbose stdout — none of it is something
    // we read.
    return spawn('git', ['fetch', this.#remote, '--quiet'], this.#dir, {
      discardStdout: true
    });
  }

  async init() {
    try {
      if (!(await doesPreviousCloneExist(this.#repo, this.#cloneRootDir))) {
        console.debug(`[Mosaic][Source-Git] Creating main worktree for repo '${this.#name}'`);

        //Empty the directory before cloning
        try {
          const items = await fs.readdir(this.#cloneRootDir);
          await Promise.all(items.map(item => fs.rm(path.join(this.#cloneRootDir, item))));
        } catch {
          await fs.mkdir(this.#cloneRootDir, { recursive: true });
        }

        await spawn(
          'git',
          [
            'clone',
            // Partial clone — skip blob contents at clone time. Blobs
            // are fetched lazily from the promisor remote when something
            // actually reads them (e.g. `git log -- <file>` for a path
            // outside the docs subtree). For a docs-only consumer this
            // is typically a 5–10× reduction in initial network + disk
            // footprint on monorepos, with no behavioural change for
            // authors using cross-folder fragments / refs.
            // Requires git ≥ 2.19; if the remote refuses partial clones
            // (rare, but some old self-hosted setups do), the client
            // falls back to a full clone automatically.
            '--filter=blob:none',
            // Only fetch refs for the branch we actually use. Mosaic's
            // `updatedFilesGenerator` polls for changes on this single
            // branch; pulling every branch's refs on every `git fetch`
            // is pure waste, and the dominant per-poll network cost on
            // busy repos.
            '--single-branch',
            '--branch',
            this.#branch,
            this.#repo,
            '--no-checkout',
            `--origin=${this.#remote}`
          ],
          // Go up 1 dir, so the clone creates the main worktree folder
          path.dirname(this.#cloneRootDir),
          { discardStdout: true }
        );
      } else {
        console.debug(`[Mosaic][Source-Git] Re-using main worktree for repo '${this.#name}'`);
      }
      this.#cloned = true;
      // Retrofit the single-branch fetch refspec on clones created by
      // a pre-uplift mosaic. `--single-branch` only applies at clone
      // time; if we inherit a multi-branch clone its
      // `remote.<name>.fetch` is `+refs/heads/*:refs/remotes/<name>/*`
      // and every `git fetch` still pulls every branch's refs. Force
      // it to the single-branch shape so the per-poll cost matches a
      // fresh clone. This is a no-op (idempotent) on clones that are
      // already single-branch — `git config --replace-all` just
      // rewrites the same value. Done after `#cloned = true` so the
      // method's own guard passes, and run unconditionally so fresh
      // clones are also normalised (cheap, idempotent).
      await this.ensureSingleBranchFetchRefspec();
      if (!(await doesPreviousCloneExist(this.#repo, this.#dir))) {
        console.debug(
          `[Mosaic][Source-Git] Creating linked worktree repo '${this.#name} branch '${
            this.#branch
          }'`
        );
        await spawn('git', ['worktree', 'add', '-f', this.#dir, this.#branch], this.#cloneRootDir, {
          discardStdout: true
        });
      } else {
        console.debug(
          `[Mosaic][Source-Git] Re-using linked worktree repo '${this.#name} branch '${
            this.#branch
          }'`
        );
        // Refresh-pull the existing worktree, but treat a failure
        // as non-fatal: the on-disk content is still a valid clone
        // (it served fine on the previous start), so the right move
        // when the remote is unreachable (off-VPN, transient DNS,
        // proxy hiccup) is to log and proceed with the stale-but-
        // serviceable worktree rather than crash the CLI worker.
        // The poll loop in `onCommitChange` will resume normal
        // refreshes the moment the remote becomes reachable again;
        // if it doesn't, it self-unsubscribes after one failure
        // (see Repo.ts:`onCommitChange`'s catch arm) and the source
        // continues to serve the last-known content read-only.
        try {
          await this.pull();
        } catch (e) {
          console.warn(
            `[Mosaic][Source-Git] Refresh-pull failed for '${this.#name}'; ` +
              `continuing with the existing on-disk worktree. ` +
              `(${(e as Error).message})`
          );
        }
      }
    } catch (e) {
      this.#cloned = false;
      throw e;
    }
  }

  async createWorktree(sid: string, branchName: string) {
    this.#dir = path.posix.join(this.#worktreeRootDir, sid);
    console.debug(`[Mosaic][Source-Git] Creating worktree for content save @ ${this.#dir}`);

    // Idempotency guard. A previous save that crashed mid-flight
    // (e.g. workflow threw before reaching its `finally`, or
    // `removeWorktree` itself failed because git's worktree
    // registry was already inconsistent) can leave the target
    // directory present on disk. `git worktree add -f` only
    // overrides a *registered* worktree at the same path — it
    // refuses with "fatal: '<dir>' already exists" when the
    // directory exists but isn't in `git worktree list`. So we
    // explicitly clear both halves of the state before retrying:
    //
    //   1. `git worktree prune` — drops registry entries whose
    //      backing directory no longer exists, and entries whose
    //      backing directory contents disagree with the registry.
    //      Harmless when there's nothing to prune.
    //
    //   2. `git worktree remove --force <dir>` — the documented
    //      way to drop a registered worktree. Wrapped in a
    //      try/catch because it fails when the directory is not
    //      currently registered, which is exactly the case we're
    //      recovering from.
    //
    //   3. `fs.rm(<dir>, { recursive: true, force: true })` —
    //      catch-all for the "dir on disk, not in registry" case.
    //      No-op when the dir is already gone (force: true).
    //
    // All three steps are individually safe to run; combined they
    // guarantee `git worktree add` below starts from a known-empty
    // slate without affecting any healthy in-use worktree for a
    // different `sid`.
    try {
      await spawn('git', ['worktree', 'prune'], this.#cloneRootDir, { discardStdout: true });
    } catch (e) {
      console.warn(
        `[Mosaic][Source-Git] worktree prune failed for '${this.#name}'; ` +
          `continuing. (${(e as Error).message})`
      );
    }
    try {
      await spawn('git', ['worktree', 'remove', '--force', this.#dir], this.#cloneRootDir, {
        discardStdout: true
      });
    } catch {
      // Expected when the target wasn't registered. Falls through
      // to the filesystem-level cleanup below.
    }
    try {
      await fs.rm(this.#dir, { recursive: true, force: true });
    } catch (e) {
      // Fs-level removal really shouldn't fail at this point;
      // surface a warning and let the `git worktree add` below
      // produce the canonical error if it still can't proceed.
      console.warn(
        `[Mosaic][Source-Git] fs.rm of stale worktree dir failed for '${this.#dir}'; ` +
          `git worktree add may still fail. (${(e as Error).message})`
      );
    }

    await spawn(
      'git',
      ['worktree', 'add', '-f', '-B', branchName, this.#dir, `${this.#remote}/${this.#branch}`],
      this.#worktreeRootDir,
      { discardStdout: true }
    );
    console.debug(`[Mosaic][Source-Git] Creating linked worktree for ${sid}`);
  }

  async removeWorktree(sid: string) {
    // The worktree dir we're removing is the one currently held in
    // `this.#dir` — `createWorktree` sets it. We capture it BEFORE
    // running `git worktree remove` because the operation should
    // be idempotent: even if git's registry is already cleaned
    // up (e.g. a previous `removeWorktree` ran on the same `sid`,
    // or `createWorktree`'s own idempotency-guard already pruned
    // it), we still want to clear the dir from disk so the next
    // `createWorktree` doesn't see a stale directory and crash
    // with "'<dir>' already exists".
    const worktreeDir = this.#dir;
    console.debug(`[Mosaic][Source-Git] Removing worktree for content save @ ${worktreeDir}`);

    // Run `git worktree remove` from the CLONE root, not from
    // inside the worktree itself. The old code passed `cwd =
    // this.#dir` (the worktree being removed), which fails when
    // the dir has already been deleted from disk, and uses the
    // bare `sid` as the path argument — git's resolution of that
    // depends on cwd and registry state in ways that are easy to
    // misread. The clone-root-relative absolute path is
    // unambiguous and works whether or not the dir still exists.
    try {
      await spawn('git', ['worktree', 'remove', '--force', worktreeDir], this.#cloneRootDir, {
        discardStdout: true
      });
    } catch (e) {
      // `git worktree remove` fails when the worktree isn't
      // registered (it was already removed, or `createWorktree`'s
      // idempotency guard pruned it). Fall through to the fs
      // cleanup below; warn so we have a paper trail in case the
      // failure was actually something else.
      console.warn(
        `[Mosaic][Source-Git] git worktree remove failed for '${worktreeDir}'; ` +
          `falling back to filesystem cleanup. (${(e as Error).message})`
      );
    }

    // Catch-all: drop the dir from disk if it still exists.
    // `force: true` makes this a no-op when the dir is already
    // gone. This is what guarantees `createWorktree` sees a
    // clean slate next time — the line we depend on most.
    try {
      await fs.rm(worktreeDir, { recursive: true, force: true });
    } catch (e) {
      // Genuinely unexpected; not fatal because `createWorktree`
      // has its own belt-and-braces cleanup, but log so we
      // notice if it becomes a pattern.
      console.warn(
        `[Mosaic][Source-Git] fs.rm of removed worktree dir failed for '${worktreeDir}': ` +
          `${(e as Error).message}`
      );
    }

    // Reset `#dir` back to the canonical branch worktree so any
    // subsequent calls on this Repo instance (e.g. another save
    // for the same user, or a refresh fetch) go through the
    // shared branch worktree instead of the now-removed sid one.
    this.#dir = path.join(this.#worktreeRootDir, this.#branch);
    console.debug(`[Mosaic][Source-Git] Removed linked worktree for ${sid}`);
  }

  getTagInfo = async (tag: string) => {
    if (!this.#cloned) {
      throw new Error('No repository cloned. Call init() to clone the initial repository.');
    }
    const result = await spawn('git', ['show', '-s', '--format="%ci|%B"', tag], this.#dir);
    const [, date, description] = result.match(/^([^|]+)\|(.*$)/) as RegExpMatchArray;
    return {
      date,
      description
    };
  };

  async configureGitUser(name: string, email: string) {
    await spawn('git', ['config', 'user.name', `${name}`], this.#dir, {
      discardStdout: true
    });
    await spawn('git', ['config', 'user.email', `${email}`], this.#dir, {
      discardStdout: true
    });
  }

  /**
   * Force `remote.<remote>.fetch` to a single-branch refspec on an
   * existing clone. New clones get this from `git clone --single-branch`
   * automatically; this exists to retrofit pre-uplift on-disk clones
   * (which were created without that flag and so still pull every
   * branch's refs on every `git fetch`).
   *
   * `--replace-all` rewrites the value rather than appending, so this
   * is idempotent across runs and safe to call on already-correct
   * clones.
   */
  async ensureSingleBranchFetchRefspec() {
    if (!this.#cloned) {
      throw new Error('No repository cloned. Call init() to clone the initial repository.');
    }
    const refspec = `+refs/heads/${this.#branch}:refs/remotes/${this.#remote}/${this.#branch}`;
    try {
      await spawn(
        'git',
        ['config', '--replace-all', `remote.${this.#remote}.fetch`, refspec],
        this.#cloneRootDir,
        { discardStdout: true }
      );
    } catch (e) {
      // Not fatal — worst case is we keep fetching every branch's refs
      // (i.e. the pre-uplift behaviour). Log and move on.
      console.warn(
        `[Mosaic][Source-Git] Could not narrow fetch refspec for '${this.#name}': ${
          (e as Error).message
        }`
      );
    }
  }

  async addChanges() {
    await spawn('git', ['add', '-A'], this.#dir, { discardStdout: true });
  }

  async commitChanges(name: string, email: string, commitMessage: string) {
    await spawn(
      'git',
      ['commit', '-m', `${commitMessage}`, '--author', `${name}<${email}>`],
      this.#dir,
      { discardStdout: true }
    );
  }

  async pushBranch(branchName: string) {
    await spawn('git', ['push', 'origin', `${branchName}`], this.#dir, {
      discardStdout: true
    });
  }

  async curlPullRequest(endpoint: string, data: string) {
    const curlResponse = await spawn(
      'curl',
      [
        '--silent',
        `${endpoint}`,
        '--request',
        'POST',
        '--header',
        'Content-Type: application/json',
        '-u',
        `${this.#credentials}`,
        '-d',
        `${data}`
      ],
      this.#dir
    );

    return curlResponse;
  }

  async createPullRequest(
    user: { sid: string; name: string; email: string },
    branchName: string,
    filePath: string,
    endpoint: string,
    requestData: string,
    commitMessage: string
  ): Promise<string | { error: string; source: string }> {
    if (!this.#cloned) {
      throw new Error('No repository cloned. Call init() to clone the initial repository.');
    }

    const sid = user.sid.toLowerCase();
    // Track whether the branch made it to the remote, so the
    // error path can flag operator-visible orphan-branch state
    // (we can't reliably auto-delete from the remote — would
    // require credentials we may not have at this layer — but a
    // log line lets someone clean up).
    let branchPushed = false;
    try {
      await this.configureGitUser(user.name, user.email);
      await this.addChanges();
      await this.commitChanges(user.name, user.email, commitMessage);
      await this.pushBranch(branchName);
      branchPushed = true;

      const curlResult = await this.curlPullRequest(endpoint, requestData);

      // Defensive parse. The previous code did
      // `JSON.parse(curlResult)` unconditionally, which throws
      // `SyntaxError: Unexpected end of JSON input` on an empty
      // response body — surfacing to the user as an opaque
      // crash. Empty bodies happen on 204/network-timeout/curl
      // exited early; surface what we know rather than blaming
      // JSON.
      if (!curlResult || !curlResult.trim()) {
        throw new Error(
          'Bitbucket API returned an empty body — the request may have failed silently. ' +
            'Check the CLI process can reach the Bitbucket API and that credentials are valid.'
        );
      }
      let jsonResult: { errors?: Array<{ message?: string }> } & Record<string, unknown>;
      try {
        jsonResult = JSON.parse(curlResult);
      } catch (e) {
        throw new Error(
          `Bitbucket API returned a malformed response (not JSON): ` +
            `${(e as Error).message}. First 200 chars of body: ` +
            `${curlResult.slice(0, 200)}`
        );
      }

      if (jsonResult.errors) {
        // `errors[0]` and `errors[0].message` may both be
        // missing; fall back to a generic message so we don't
        // get `Cannot read properties of undefined (reading
        // 'message')` masking the real Bitbucket error shape.
        const firstError = jsonResult.errors[0];
        const message =
          (firstError && typeof firstError.message === 'string' && firstError.message) ||
          'Bitbucket API reported an unspecified error.';
        throw new Error(message);
      }
      return jsonResult as unknown as string;
    } catch (e: unknown) {
      console.group('[Mosaic][Source-Git] Pull Request Error');
      console.log('fullPath', filePath);
      console.log('Branch Name', branchName);
      console.log('Name', this.#name);
      console.log('Remote', this.#remote);
      console.error(e);
      console.groupEnd();
      if (branchPushed) {
        // See the matching warning in
        // `GitHubPullRequestWorkflow.ts` — if push succeeded but
        // the PR call failed, the remote has a branch with no
        // PR attached. Surface it so operators can clean up.
        console.warn(
          `[Mosaic][Source-Git] Pushed branch '${branchName}' may now be orphaned on the remote ` +
            `(PR creation failed after push). If the branch exists on the remote and no PR was raised, ` +
            `it can be deleted manually.`
        );
      }
      return {
        error: `Error creating Pull Request: ${getErrorMessage(e)} `,
        source: `${this.#name}`
      };
    } finally {
      // Idempotent with the workflow's outer finally — both call
      // `removeWorktree(sid)`, and the second is a no-op since
      // `removeWorktree` itself is idempotent.
      try {
        await this.removeWorktree(sid);
      } catch (e) {
        console.warn(
          `[Mosaic][Source-Git] removeWorktree failed for '${sid}' in createPullRequest finally: ` +
            `${(e as Error).message}. The next createWorktree call will recover via its ` +
            `idempotency guard.`
        );
      }
    }
  }
}
