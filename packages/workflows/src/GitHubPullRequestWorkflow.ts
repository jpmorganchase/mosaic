import { Octokit } from '@octokit/core';
import path from 'node:path';
import fs from 'node:fs';
import { v4 as uuidv4 } from 'uuid';
import { Repo, GitRepoSourceOptions } from '@jpmorganchase/mosaic-source-git-repo';
import { mdx } from '@jpmorganchase/mosaic-serialisers';
import type { SendSourceWorkflowMessage, SourceWorkflow } from '@jpmorganchase/mosaic-types';
import { ProxyAgent, fetch as undiciFetch } from 'undici';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

interface GitHubPullRequestWorkflowData {
  user: { id: string; name: string; email: string };
  markdown: string;
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
  { user, markdown }: GitHubPullRequestWorkflowData
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

  let repoInstance: Repo | null = new Repo(credentials, remote, sourceBranch, repoUrl);
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

  const rawPage = await fs.promises.readFile(pathOnDisk);
  const { content, ...metadata } = await mdx.deserialise(pathOnDisk, rawPage);
  const updatedPage = { ...metadata, content: markdown };
  sendWorkflowProgressMessage('Updated page content', 'IN_PROGRESS');
  await fs.promises.writeFile(pathOnDisk, await mdx.serialise(pathOnDisk, updatedPage));
  sendWorkflowProgressMessage('Saved page', 'IN_PROGRESS');

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

  let prResult = null;

  try {
    await repoInstance.configureGitUser(user.name, user.email);
    await repoInstance.addChanges();
    await repoInstance.commitChanges(user.name, user.email, commitMessage(filePath));
    await repoInstance.pushBranch(branchName);

    const result = await githubClient.request(`POST ${apiEndpoint}`, {
      owner: repoInstance.projectName,
      repo: repoInstance.repoName,
      title: `${titlePrefix} - Content update - ${filePath}`,
      body: commitMessage(filePath),
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
    console.group('[Mosaic] Pull Request Error');
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
    repoInstance = null;
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
