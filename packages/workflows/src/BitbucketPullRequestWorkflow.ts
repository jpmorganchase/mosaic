import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Repo, GitRepoSourceOptions } from '@jpmorganchase/mosaic-source-git-repo';
import { mdx } from '@jpmorganchase/mosaic-serialisers';
import type { SourceWorkflow } from '@jpmorganchase/mosaic-types';

interface BitbucketPullRequestWorkflowData {
  user: { sid: string; name: string; email: string };
  markdown: string;
}

interface BitbucketPullRequestWorkflowOptions {
  apiEndpoint: string;
  commitMessage: (filePath: string) => string;
  titlePrefix: string;
}

async function createPullRequest(
  sourceOptions: GitRepoSourceOptions,
  { apiEndpoint, commitMessage, titlePrefix }: BitbucketPullRequestWorkflowOptions,
  filePath: string,
  { user, markdown }: BitbucketPullRequestWorkflowData
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

  let repoInstance: Repo | null = new Repo(credentials, remote, sourceBranch, repoUrl);
  await repoInstance.init();

  const branchName = `${user.sid.toLowerCase()}-${uuidv4()}`;
  await repoInstance.createWorktree(user.sid.toLowerCase(), branchName);

  /**
   * strip out the namespace from the file path.
   * We are interested in the file on disk not in the VFS
   */
  const pathOnDisk = path.posix.join(
    repoInstance.dir,
    subfolder,
    filePath.replace(new RegExp(`${prefixDir}/`), '')
  );

  const rawPage = await fs.promises.readFile(pathOnDisk);
  const { content, ...metadata } = await mdx.deserialise(pathOnDisk, rawPage);
  const updatedPage = { ...metadata, content: markdown };

  await fs.promises.writeFile(pathOnDisk, await mdx.serialise(pathOnDisk, updatedPage));

  const bitBucketRequest = JSON.stringify({
    title: `${titlePrefix} - Content update - ${filePath}`,
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

  const result = repoInstance.createPullRequest(
    user,
    branchName,
    filePath,
    endpoint,
    bitBucketRequest,
    commitMessage(filePath)
  );

  repoInstance = null;
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
