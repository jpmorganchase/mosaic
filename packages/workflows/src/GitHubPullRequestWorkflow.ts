import { Octokit } from '@octokit/core';
import path from 'node:path';
import fs from 'node:fs';
import { v4 as uuidv4 } from 'uuid';
import matter from 'gray-matter';
import { Repo, GitRepoSourceOptions } from '@jpmorganchase/mosaic-source-git-repo';
import { mdx } from '@jpmorganchase/mosaic-serialisers';
import type { SendSourceWorkflowMessage, SourceWorkflow } from '@jpmorganchase/mosaic-types';
import { ProxyAgent, fetch as undiciFetch } from 'undici';

import { renamePageIfRequested } from './renamePageIfRequested.js';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

interface GitHubPullRequestWorkflowData {
  user: { id: string; name: string; email: string };
  markdown: string;
  /**
   * Optional authored frontmatter (bare YAML, no `---` fences)
   * from the in-browser editor's Frontmatter tab. When present
   * we replace the on-disk metadata with the parsed result;
   * when absent we keep the on-disk metadata verbatim (historical
   * body-only behaviour).
   *
   * The editor only sends this when it edited against the *raw*
   * on-disk source — i.e. `rawSource.kind === 'raw'`. The
   * read-only Frontmatter fallback never sets it, so this can't
   * pollute the source file with plugin-derived fields (sidebar,
   * breadcrumbs, etc.) baked into the post-plugin view.
   */
  frontmatter?: string;
  /**
   * Optional new VFS route to rename the page to. Mosaic uses
   * file-based routing, so renaming the file is equivalent to
   * changing the page's URL — non-technical authors who want
   * to move `/docs/old-name` to `/docs/new-name` would otherwise
   * have to open the source repo manually.
   *
   * Same shape as `filePath` (the route the workflow receives
   * positionally): a VFS path including the source namespace
   * (`prefixDir`), e.g. `/docs/foo/bar.mdx`. When omitted or
   * structurally equal to `filePath` no rename happens.
   *
   * Constrained for safety:
   *
   *   - must stay within the same source (`prefixDir` must
   *     match) — moving a page across sources implies different
   *     repos and is out of scope for a single PR.
   *   - the new path's directory tree is created with
   *     `recursive: true` so authors can rename into folders
   *     that don't yet exist.
   *   - if the target already exists on disk the rename is
   *     rejected and the workflow emits an error rather than
   *     clobbering an existing file.
   */
  targetRoute?: string;
  /**
   * When `true` the workflow treats `filePath` as a brand-new
   * page rather than an edit of an existing one. Skips the
   * on-disk `readFile` (the file doesn't exist yet), creates
   * the parent directory tree with `mkdir -p`, and refuses with
   * a clear error if a file is already present at `pathOnDisk`
   * (defends against a race where two authors pick the same
   * route concurrently — `git add -A` would otherwise quietly
   * commit whichever clobber won).
   *
   * Requires `frontmatter` to be a string: a new page must
   * specify at least a `title`, and the on-disk fallback path
   * (which would otherwise supply the metadata) doesn't exist
   * in the create case.
   */
  isNewPage?: boolean;
}

interface GitHubPullRequestWorkflowOptions {
  apiEndpoint: string;
  commitMessage: (filePath: string) => string;
  titlePrefix: string;
  proxyEndpoint?: string;
}

export async function createPullRequest(
  sendWorkflowProgressMessage: SendSourceWorkflowMessage,
  sourceOptions: GitRepoSourceOptions,
  { apiEndpoint, commitMessage, titlePrefix, proxyEndpoint }: GitHubPullRequestWorkflowOptions,
  filePath: string,
  { user, markdown, frontmatter, targetRoute, isNewPage }: GitHubPullRequestWorkflowData
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
    return false;
  }

  const repoInstance: Repo = new Repo(credentials, remote, sourceBranch, repoUrl);
  await repoInstance.init();
  const userId = user.id.toLowerCase();

  sendWorkflowProgressMessage('GitHub clone complete', 'IN_PROGRESS');

  const branchName = `${userId}-${uuidv4()}`;
  await repoInstance.createWorktree(userId, branchName);
  sendWorkflowProgressMessage('Created git worktree', 'IN_PROGRESS');

  /**
   * strip out the namespace from the file path.
   * We are interested in the file on disk not in the VFS
   */
  const pathOnDisk = path.posix.join(
    repoInstance.dir,
    subfolder,
    filePath.replace(new RegExp(`${prefixDir}/`), '')
  );

  /**
   * Create vs. edit branch.
   *
   * - Edit: read the on-disk file, deserialise it for its
   *   frontmatter, optionally swap in the editor's authored
   *   slice, write the body back.
   * - Create: the file doesn't exist yet, so skip the readFile
   *   entirely; require the editor to have sent a frontmatter
   *   slice (a new page must at minimum specify a title);
   *   create the parent directory tree; and refuse if a file is
   *   already present at the target path (race protection —
   *   `git add -A` would otherwise quietly commit whichever
   *   clobber won).
   */
  let nextMeta: Record<string, unknown>;
  if (isNewPage) {
    // Race-protection: if two authors picked the same new
    // route concurrently and the other one's PR already
    // landed (or their session also created the file in this
    // worktree), bail loudly rather than overwriting.
    try {
      await fs.promises.access(pathOnDisk);
      const error = `Refusing to create: ${filePath} already exists.`;
      sendWorkflowProgressMessage(error, 'ERROR');
      await repoInstance.removeWorktree(userId);
      return { error, source: repoInstance.name };
    } catch {
      // Doesn't exist — proceed with the create.
    }

    if (typeof frontmatter !== 'string') {
      const error =
        'Refusing to create: a new page requires authored frontmatter (at least a title).';
      sendWorkflowProgressMessage(error, 'ERROR');
      await repoInstance.removeWorktree(userId);
      return { error, source: repoInstance.name };
    }

    try {
      nextMeta = (matter(`---\n${frontmatter}\n---\n`).data ?? {}) as Record<string, unknown>;
      // `fullPath` is a required field on the on-disk Page type
      // and is normally re-attached from the disk read on the
      // edit path. For a brand-new page there's no on-disk
      // source, so we synthesise it from the VFS `filePath`
      // (which is what the serialiser uses for path-dependent
      // decisions anyway). Downstream regenerators (sidebar,
      // breadcrumbs) recompute their own `fullPath`-derived
      // fields, so this value is only ever the on-disk hint.
      nextMeta.fullPath = filePath;
    } catch (e) {
      const error = `Could not parse authored frontmatter for new page: ${getErrorMessage(e)}`;
      sendWorkflowProgressMessage(error, 'ERROR');
      await repoInstance.removeWorktree(userId);
      return { error, source: repoInstance.name };
    }

    await fs.promises.mkdir(path.posix.dirname(pathOnDisk), { recursive: true });
    sendWorkflowProgressMessage('Creating new page', 'IN_PROGRESS');
  } else {
    const rawPage = await fs.promises.readFile(pathOnDisk);
    const { content: _content, ...metadata } = await mdx.deserialise(pathOnDisk, rawPage);

    /**
     * Choose the frontmatter that will be written to disk.
     *
     * If the editor sent an authored slice we parse it and use it
     * verbatim. Otherwise we keep `metadata` (the frontmatter we
     * just read off disk) as-is, preserving the historical
     * body-only behaviour for callers that haven't opted in.
     *
     * Parse failures fall back to the on-disk metadata and emit a
     * warning so the body change still lands rather than failing
     * silently.
     *
     * `fullPath` is re-attached from disk because it's a
     * server-side filesystem coordinate, not authored metadata —
     * the editor's YAML neither carries nor should carry it.
     * Every other Page field is optional, so a missing key in the
     * parsed YAML is treated as a deliberate deletion (matching
     * what a manual editor edit would do).
     */
    nextMeta = metadata as Record<string, unknown>;
    if (typeof frontmatter === 'string') {
      try {
        const parsed = (matter(`---\n${frontmatter}\n---\n`).data ?? {}) as Record<string, unknown>;
        nextMeta = { ...parsed, fullPath: (metadata as { fullPath?: unknown }).fullPath };
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

  const updatedPage = { ...nextMeta, content: markdown } as unknown as Parameters<
    typeof mdx.serialise
  >[1];
  if (!isNewPage) {
    sendWorkflowProgressMessage('Updated page content', 'IN_PROGRESS');
  }
  await fs.promises.writeFile(pathOnDisk, await mdx.serialise(pathOnDisk, updatedPage));
  sendWorkflowProgressMessage('Saved page', 'IN_PROGRESS');

  /**
   * Optional file rename for file-based routing — see
   * `./renamePageIfRequested.ts` for the full contract and
   * safety rails. On rejection we abort the PR before
   * `addChanges` so the worktree is never left in a half-edited
   * state.
   */
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
      await repoInstance.removeWorktree(userId);
      return { error: renameResult.error, source: repoInstance.name };
    }
  }

  /** create a new fetcher with proxy agent configured if required. */
  const fetcher: typeof undiciFetch = proxyEndpoint
    ? (url, opts) => {
        return undiciFetch(url, {
          ...opts,
          dispatcher: new ProxyAgent({
            uri: proxyEndpoint,
            keepAliveTimeout: 10,
            keepAliveMaxTimeout: 10
          })
        });
      }
    : undiciFetch;

  const token = credentials.split(':')[1];

  // get a new client
  const githubClient = new Octokit({
    auth: token,
    request: {
      fetch: fetcher,
      timeout: 5000
    }
  });

  sendWorkflowProgressMessage('Creating Pull Request', 'IN_PROGRESS');

  let prResult: string | { error: string; source: string } | null;

  // Per-action commit message + PR title so the resulting PR
  // reads naturally as "created" vs. "updated". The base
  // `commitMessage(filePath)` is preserved as the workflow
  // option default so callers that haven't opted in still see
  // their configured copy.
  const action = isNewPage ? 'created' : 'updated';
  const commitMsg = isNewPage
    ? commitMessage(filePath).replace('updated content', 'created content')
    : commitMessage(filePath);
  const prTitle = `${titlePrefix} - Content ${action} - ${filePath}`;

  try {
    await repoInstance.configureGitUser(user.name, user.email);
    await repoInstance.addChanges();
    await repoInstance.commitChanges(user.name, user.email, commitMsg);
    await repoInstance.pushBranch(branchName);

    const result = await githubClient.request(`POST ${apiEndpoint}`, {
      owner: repoInstance.projectName,
      repo: repoInstance.repoName,
      title: prTitle,
      body: commitMsg,
      head: branchName,
      base: sourceBranch,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    /**
     * https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28#create-a-pull-request
     * Status 201 = created
     */
    if (result.status === 201) {
      prResult = result.data.url;
    } else {
      throw new Error(`${result.data.status} - ${result.data.message}`);
    }
  } catch (e: unknown) {
    console.group('[Mosaic][Workflows] Pull Request Error');
    console.log('fullPath', filePath);
    console.log('Head', branchName);
    console.log('Base', sourceBranch);
    console.error(e);
    console.groupEnd();

    prResult = {
      error: `Error creating Pull Request: ${getErrorMessage(e)} `,
      source: `${repoInstance.name}`
    };
  } finally {
    await repoInstance.removeWorktree(userId);
  }

  sendWorkflowProgressMessage(prResult, 'COMPLETE');
  return prResult;
}

const workflow: SourceWorkflow = {
  name: 'save',
  options: {
    titlePrefix: 'Mosaic Docs',
    apiEndpoint: 'https://api.github.com/repos/{owner}/{repo}/pulls',
    commitMessage: (filePath: string) => `docs: updated content ${filePath} (UIE-7026)`
  },
  action: createPullRequest
};

export default workflow;
