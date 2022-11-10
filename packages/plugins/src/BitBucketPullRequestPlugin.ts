import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import { Repo, BitbucketSourceOptions } from '@jpmorganchase/mosaic-source-bitbucket';
import mdxSerialisers from '@jpmorganchase/mosaic-serialisers/dist/mdx';

interface BitBucketPullRequestPluginData {
  user: { sid: string; name: string; email: string };
  markdown: string;
}

interface BitBucketPullRequestPluginOptions {
  apiEndpoint: string;
  commitMessage: string;
  titlePrefix: string;
}

let repoInstance: Repo | null = null;

const BitBucketPullRequestPlugin: PluginType<Page, BitBucketPullRequestPluginOptions> = {
  async saveContent(
    filePath,
    data: BitBucketPullRequestPluginData,
    sourceOptions: BitbucketSourceOptions,
    _helpers,
    { apiEndpoint, commitMessage, titlePrefix }
  ) {
    const { user, markdown } = data;
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

    if (!repoInstance) {
      repoInstance = new Repo(credentials, remote, sourceBranch, repoUrl);
      await repoInstance.init();
    }

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
    const { content, ...metadata } = await mdxSerialisers.deserialise(pathOnDisk, rawPage);
    const updatedPage = { ...metadata, content: markdown };

    await fs.promises.writeFile(
      pathOnDisk,
      await mdxSerialisers.serialise(pathOnDisk, updatedPage)
    );

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

    return repoInstance.createPullRequest(
      user,
      branchName,
      filePath,
      endpoint,
      bitBucketRequest,
      commitMessage
    );
  }
};

export default BitBucketPullRequestPlugin;
