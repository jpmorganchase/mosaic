import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import matter from 'gray-matter';
import { Repo, GitRepoSourceOptions } from '@jpmorganchase/mosaic-source-git-repo';
import { mdx } from '@jpmorganchase/mosaic-serialisers';
import type { SendSourceWorkflowMessage, SourceWorkflow } from '@jpmorganchase/mosaic-types';

import { renamePageIfRequested } from './renamePageIfRequested.js';
import { stripUndefined } from './stripUndefined.js';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Escape a string for safe use inside a `new RegExp(...)`. Config
 * strings (`prefixDir`, `subfolder`) interpolated into regex
 * sources can otherwise contain metacharacters — `.`, `+`, `(`,
 * `[`, etc. — and silently match unintended paths. The set of
 * characters escaped here is the union of all metacharacters that
 * have special meaning in any JS regex context, per
 * MDN/`RegExp` reference.
 */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface BitbucketPullRequestWorkflowData {
  user: { sid: string; name: string; email: string };
  markdown: string;
  /**
   * Optional authored frontmatter (bare YAML, no `---` fences)
   * from the in-browser editor's Frontmatter tab. See the
   * matching field on `GitHubPullRequestWorkflow` for full
   * rationale — same contract, same fallback semantics.
   */
  frontmatter?: string;
  /**
   * Brand-new-page flag. Same contract as the matching field
   * on `GitHubPullRequestWorkflow` — when `true` the workflow
   * skips the on-disk readFile, creates the parent directory
   * tree, refuses if the target already exists, and requires
   * `frontmatter` to be present.
   */
  isNewPage?: boolean;
  /**
   * Optional new VFS route for a file rename. See the matching
   * field on `GitHubPullRequestWorkflow` for the full contract
   * — same safety rails (must stay under the source's
   * `prefixDir`, refuses to overwrite an existing target).
   */
  targetRoute?: string;
}

interface BitbucketPullRequestWorkflowOptions {
  apiEndpoint: string;
  commitMessage: (filePath: string) => string;
  titlePrefix: string;
}

async function createPullRequest(
  sendWorkflowProgressMessage: SendSourceWorkflowMessage,
  sourceOptions: GitRepoSourceOptions,
  { apiEndpoint, commitMessage, titlePrefix }: BitbucketPullRequestWorkflowOptions,
  filePath: string,
  { user, markdown, frontmatter, targetRoute, isNewPage }: BitbucketPullRequestWorkflowData
) {
  const {
    credentials,
    remote,
    branch: sourceBranch,
    repo: repoUrl,
    subfolder,
    prefixDir
  } = sourceOptions;

  if (!repoUrl || !markdown) {
    // indicate to the plugin runner that no save happened
    return false;
  }

  // `apiEndpoint` is read from `BITBUCKET_API_URL` at workflow
  // module-load (see the workflow object at the bottom of this
  // file). When the CLI is launched from a shell that never
  // exported the var — which is easy to do, since the Mosaic CLI
  // does not load `.env` files on its own — `apiEndpoint` is an
  // empty string and the PR-creation curl below gets a relative
  // URL like `/projects/.../pull-requests`, which exits with code
  // 3 ("URL malformed") and surfaces as an opaque spawn failure.
  // Refuse early with a message authors can act on.
  if (!apiEndpoint) {
    sendWorkflowProgressMessage(
      'BITBUCKET_API_URL is not set in the Mosaic CLI process environment; ' +
        'cannot raise a pull request. Export it in the shell that launches ' +
        'the CLI (e.g. `export BITBUCKET_API_URL=https://bitbucketdc.example/rest/api/1.0`) ' +
        'or use a dotenv loader before starting `mosaic serve`.',
      'ERROR'
    );
    return false;
  }

  const repoInstance: Repo = new Repo(credentials, remote, sourceBranch, repoUrl);
  await repoInstance.init();
  sendWorkflowProgressMessage('Bitbucket clone complete', 'IN_PROGRESS');

  // Validate the user identifier before constructing a branch name.
  // An empty `sid` produces a branch like `"-<uuid>"` which git
  // accepts but is operationally confusing (e.g. orphan-branch
  // cleanup scripts that filter by sid prefix). The persistAction
  // intentionally falls back to email or name when sid is missing,
  // so we honour those too — but require *something* non-empty.
  const sidLower = (user.sid ?? '').toLowerCase();
  if (!sidLower) {
    sendWorkflowProgressMessage(
      'Cannot create a pull request: the authenticated user has no SID, email, or name.',
      'ERROR'
    );
    return false;
  }

  const branchName = `${sidLower}-${uuidv4()}`;
  await repoInstance.createWorktree(sidLower, branchName);
  sendWorkflowProgressMessage('Created git worktree', 'IN_PROGRESS');

  /**
   * Single try/finally covering everything between the worktree
   * being created and the PR being raised. Without this every
   * early-return (file already exists, missing frontmatter, parse
   * error, rename refused) and every async throw (mkdir,
   * readFile, deserialise, matter(), stripUndefined, serialise,
   * writeFile) leaves the worktree on disk — recoverable by the
   * idempotency guard in `Repo.createWorktree` on the *next* save,
   * but still an observable leak and an opaque crash for the
   * current one. The finally arm guarantees cleanup; the catch
   * arm converts any uncaught throw into a normal ERROR event so
   * the editor's progress dialog always resolves (instead of the
   * dialog hanging on the bare-socket-close path we already
   * handled defensively in persistAction.ts).
   *
   * `repoInstance.createPullRequest` (called below) has its OWN
   * try/finally that calls `removeWorktree` — that's fine, it's
   * idempotent (the second `git worktree remove` is harmlessly
   * `--force`d). Belt and braces.
   */
  try {
    /**
     * strip out the namespace from the file path.
     * We are interested in the file on disk not in the VFS
     */
    const pathOnDisk = path.posix.join(
      repoInstance.dir,
      subfolder,
      // `prefixDir` is a config string; escape regex metacharacters
      // so values like `docs.v2` don't silently match `docsAv2`.
      filePath.replace(new RegExp(`${escapeRegExp(prefixDir)}/`), '')
    );

    /**
     * Create vs. edit branch — see the matching block in
     * `GitHubPullRequestWorkflow.ts` for the full rationale.
     * Same contract: `isNewPage` skips the readFile, requires
     * `frontmatter`, creates the parent directory tree, and
     * refuses on a pre-existing target.
     */
    let nextMeta: Record<string, unknown>;
    if (isNewPage) {
      try {
        await fs.promises.access(pathOnDisk);
        sendWorkflowProgressMessage(`Refusing to create: ${filePath} already exists.`, 'ERROR');
        return false;
      } catch {
        // Doesn't exist — proceed.
      }

      if (typeof frontmatter !== 'string') {
        sendWorkflowProgressMessage(
          'Refusing to create: a new page requires authored frontmatter (at least a title).',
          'ERROR'
        );
        return false;
      }

      try {
        nextMeta = (matter(`---\n${frontmatter}\n---\n`).data ?? {}) as Record<string, unknown>;
        // See the matching synthesise note in
        // `GitHubPullRequestWorkflow.ts` — the on-disk `Page`
        // type requires `fullPath`, but for a brand-new page
        // there's no on-disk source to read it from.
        nextMeta.fullPath = filePath;
      } catch (e) {
        sendWorkflowProgressMessage(
          `Could not parse authored frontmatter for new page: ${getErrorMessage(e)}`,
          'ERROR'
        );
        return false;
      }

      await fs.promises.mkdir(path.posix.dirname(pathOnDisk), { recursive: true });
      sendWorkflowProgressMessage('Creating new page', 'IN_PROGRESS');
    } else {
      const rawPage = await fs.promises.readFile(pathOnDisk);
      const { content: _content, ...metadata } = await mdx.deserialise(pathOnDisk, rawPage);

      // Honour an authored frontmatter slice from the editor when
      // present; otherwise fall back to the historical body-only
      // behaviour. See `GitHubPullRequestWorkflow` for the full
      // rationale (including the `fullPath`-preservation type note)
      // — this is the same contract.
      nextMeta = metadata as Record<string, unknown>;
      if (typeof frontmatter === 'string') {
        try {
          const parsed = (matter(`---\n${frontmatter}\n---\n`).data ?? {}) as Record<string, unknown>;
          // Preserve `fullPath` from the on-disk metadata, but ONLY
          // when it's actually set. Writing `fullPath: undefined`
          // here propagates an `undefined` field into `updatedPage`
          // → `js-yaml` refuses to dump `undefined` and throws
          // `YAMLException: unacceptable kind of an object to dump
          // [object Undefined]`. The serialiser destructures
          // `{ content, ...meta }`, so a missing key is fine;
          // an explicit-undefined key is not.
          const preservedFullPath = (metadata as { fullPath?: unknown }).fullPath;
          nextMeta =
            preservedFullPath !== undefined
              ? { ...parsed, fullPath: preservedFullPath }
              : { ...parsed };
          sendWorkflowProgressMessage('Applied authored frontmatter', 'IN_PROGRESS');
        } catch (e) {
          sendWorkflowProgressMessage(
            `Could not parse authored frontmatter (${getErrorMessage(
              e
            )}); keeping on-disk frontmatter.`,
            'IN_PROGRESS'
          );
        }
      }
    }

    // Belt-and-braces guard: strip every `undefined` value from the
    // frontmatter tree before handing it to `gray-matter` →
    // `js-yaml`. See `./stripUndefined.ts` for the full rationale.
    const cleanMeta = stripUndefined(nextMeta) as Record<string, unknown>;
    const updatedPage = { ...cleanMeta, content: markdown } as unknown as Parameters<
      typeof mdx.serialise
    >[1];
    if (!isNewPage) {
      sendWorkflowProgressMessage('Updated page content', 'IN_PROGRESS');
    }
    await fs.promises.writeFile(pathOnDisk, await mdx.serialise(pathOnDisk, updatedPage));
    sendWorkflowProgressMessage('Saved page', 'IN_PROGRESS');

    // Optional rename — see `./renamePageIfRequested.ts` for the
    // shared contract.
    if (typeof targetRoute === 'string' && targetRoute !== filePath) {
      const renameResult = await renamePageIfRequested({
        filePath,
        targetRoute,
        prefixDir,
        subfolder,
        repoDir: repoInstance.dir,
        pathOnDisk,
        sendWorkflowProgressMessage
      });
      if (!renameResult.ok) {
        sendWorkflowProgressMessage(renameResult.error, 'ERROR');
        return false;
      }
    }
    const bitBucketRequest = JSON.stringify({
      title: `${titlePrefix} - Content ${isNewPage ? 'created' : 'update'} - ${filePath}`,
      fromRef: {
        id: `refs/heads/${branchName}`,
        repository: {
          slug: `${repoInstance.repoName}`,
          name: null,
          project: {
            key: `${repoInstance.projectName}`
          }
        }
      },
      toRef: {
        id: `refs/heads/${sourceBranch}`,
        repository: {
          slug: `${repoInstance.repoName}`,
          name: null,
          project: {
            key: `${repoInstance.projectName}`
          }
        }
      }
    });

    const endpoint = `${apiEndpoint}/projects/${repoInstance.projectName}/repos/${repoInstance.repoName}/pull-requests`;
    sendWorkflowProgressMessage('Creating Pull Request', 'IN_PROGRESS');
    // Rewrite the configured commit-message template's verb on
    // the create path so the PR reads naturally ("created
    // content" vs. "updated content"). Callers' configured
    // template is preserved verbatim on the edit path.
    const commitMsg = isNewPage
      ? commitMessage(filePath).replace('updated content', 'created content')
      : commitMessage(filePath);
    const result = await repoInstance.createPullRequest(
      user,
      branchName,
      filePath,
      endpoint,
      bitBucketRequest,
      commitMsg
    );

    // `createPullRequest` returns either a success payload
    // (Bitbucket PR JSON) or `{ error, source }` on failure. The
    // old code unconditionally sent `'COMPLETE'`, which made the
    // editor treat a failed PR as success and silently drop the
    // user's work — the dialog closed with no PR link and the
    // pushed branch was orphaned without any visible signal.
    // Detect the error shape and propagate the right status.
    if (result && typeof result === 'object' && 'error' in result) {
      sendWorkflowProgressMessage(
        typeof (result as { error?: unknown }).error === 'string'
          ? ((result as { error: string }).error)
          : 'Pull request creation failed.',
        'ERROR'
      );
      return result;
    }

    sendWorkflowProgressMessage(result, 'COMPLETE');
    return result;
  } catch (e) {
    // Any throw between createWorktree and the PR call lands
    // here. Convert to an ERROR event so the editor stops
    // waiting; the finally arm below cleans up the worktree.
    sendWorkflowProgressMessage(
      `Save failed: ${getErrorMessage(e)}`,
      'ERROR'
    );
    return false;
  } finally {
    // Idempotent: matches `Repo.createPullRequest`'s own
    // `removeWorktree` in its finally arm. Running it twice is
    // harmless (`--force`), running it zero times leaks the
    // worktree. The catch arm above already turned every throw
    // into an ERROR event, so this finally always runs cleanly
    // even when the workflow body errored mid-flight.
    try {
      await repoInstance.removeWorktree(sidLower);
    } catch (e) {
      console.warn(
        `[Mosaic][Workflows] removeWorktree failed for '${sidLower}': ${getErrorMessage(e)}. ` +
          `The next save will recover via the idempotency guard in Repo.createWorktree.`
      );
    }
  }
}

const workflow: SourceWorkflow = {
  name: 'save',
  options: {
    titlePrefix: 'Mosaic Docs',
    // `apiEndpoint` resolves at action-call time via a getter, not
    // at module-import time. The Mosaic CLI does not load `.env`
    // files on its own (see the CLI bin in `@jpmorganchase/mosaic-cli`),
    // so a literal `process.env.BITBUCKET_API_URL` read here would
    // capture whatever the var was when this module was first
    // imported — typically empty, when callers rely on a dotenv
    // loader that runs after import. A getter lets callers wire env
    // any way they like (shell export, dotenv wrapper around CLI
    // boot, runtime patches) and have the workflow pick up the
    // current value when it actually needs it.
    get apiEndpoint() {
      return process.env.BITBUCKET_API_URL || '';
    },
    commitMessage: (filePath: string) => `docs: updated content ${filePath} (UIE-7026)`
  },
  action: createPullRequest
};

export default workflow;
