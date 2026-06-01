import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import matter from 'gray-matter';
import { Repo, GitRepoSourceOptions } from '@jpmorganchase/mosaic-source-git-repo';
import { mdx } from '@jpmorganchase/mosaic-serialisers';
import type { SendSourceWorkflowMessage, SourceWorkflow } from '@jpmorganchase/mosaic-types';

import { renamePageIfRequested } from './renamePageIfRequested.js';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
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

  const repoInstance: Repo = new Repo(credentials, remote, sourceBranch, repoUrl);
  await repoInstance.init();
  sendWorkflowProgressMessage('Bitbucket clone complete', 'IN_PROGRESS');

  const branchName = `${user.sid.toLowerCase()}-${uuidv4()}`;
  await repoInstance.createWorktree(user.sid.toLowerCase(), branchName);
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

  // Optional rename — see `./renamePageIfRequested.ts` for the
  // shared contract. Bitbucket doesn't currently call
  // `removeWorktree` on its error paths so we don't add it
  // here either (mirroring the existing workflow's cleanup
  // style); the rename error short-circuits via `return false`
  // which the source manager treats as a no-op save.
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

  sendWorkflowProgressMessage(result, 'COMPLETE');

  return result;
}

const workflow: SourceWorkflow = {
  name: 'save',
  options: {
    titlePrefix: 'Mosaic Docs',
    apiEndpoint: process.env.BITBUCKET_API_URL || '',
    commitMessage: (filePath: string) => `docs: updated content ${filePath} (UIE-7026)`
  },
  action: createPullRequest
};

export default workflow;
