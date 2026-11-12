import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseFrontmatter } from '@jpmorganchase/mosaic-serialisers/frontmatter';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  repoDir: '',
  init: vi.fn(),
  createWorktree: vi.fn(),
  removeWorktree: vi.fn(),
  createPullRequest: vi.fn(),
  addChanges: vi.fn(),
  commitChanges: vi.fn(),
  pushBranch: vi.fn(),
  githubRequest: vi.fn()
}));

vi.mock('@jpmorganchase/mosaic-source-git-repo', () => ({
  Repo: class {
    get dir() {
      return mocks.repoDir;
    }
    name = 'test-repository';
    projectName = 'docs';
    repoName = 'site';
    init = mocks.init;
    createWorktree = mocks.createWorktree;
    removeWorktree = mocks.removeWorktree;
    createPullRequest = mocks.createPullRequest;
    addChanges = mocks.addChanges;
    commitChanges = mocks.commitChanges;
    pushBranch = mocks.pushBranch;
  }
}));

vi.mock('@octokit/core', () => ({
  Octokit: class {
    request = mocks.githubRequest;
  }
}));

// Exercise real MDX serialization and filesystem writes without a build of
// the serialisers package or any Git/network side effects.
vi.mock('@jpmorganchase/mosaic-serialisers', async () => ({
  mdx: (await import('../../../serialisers/src/mdx')).default
}));

import BitbucketPullRequestWorkflow from '../BitbucketPullRequestWorkflow';
import GitHubPullRequestWorkflow from '../GitHubPullRequestWorkflow';

const user = { sid: 'editor', name: 'Editor', email: 'editor@example.test' };
const sourceOptions = {
  repo: 'https://git.example.test/docs/site.git',
  credentials: 'user:token',
  remote: 'origin',
  branch: 'main',
  prefixDir: 'docs',
  subfolder: 'content',
  extensions: ['.mdx'],
  disableAutoPullChanges: false
};
const route = '/docs/new-section.mdx';
const pullRequestUrl = 'https://git.example.test/docs/site/pull/1';
const apiUrl = 'https://api.git.example.test/repos/docs/site/pulls/1';

beforeEach(async () => {
  vi.resetAllMocks();
  mocks.repoDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mosaic-save-workflow-'));
  mocks.createPullRequest.mockResolvedValue({ links: { self: [{ href: pullRequestUrl }] } });
  mocks.githubRequest.mockResolvedValue({
    status: 201,
    data: { url: apiUrl, html_url: pullRequestUrl }
  });
});

afterEach(async () => {
  await fs.promises.rm(mocks.repoDir, { recursive: true, force: true });
});

describe.each([
  ['Bitbucket', BitbucketPullRequestWorkflow],
  ['GitHub', GitHubPullRequestWorkflow]
] as const)('%s save workflow', (_provider, workflow) => {
  const workflowOptions = {
    ...workflow.options,
    apiEndpoint: 'https://api.git.example.test'
  };

  test('creates a frontmatter-only page and reports a provider-independent browser link', async () => {
    const send = vi.fn();
    const result = await workflow.action(send, sourceOptions, workflowOptions, route, {
      user,
      markdown: '',
      frontmatter: 'title: New section\nlayout: DetailBase',
      isNewPage: true
    });

    const written = parseFrontmatter(
      await fs.promises.readFile(path.join(mocks.repoDir, 'content/new-section.mdx'))
    );
    expect(written.data).toMatchObject({ title: 'New section', layout: 'DetailBase' });
    expect(written.content.trim()).toBe('');
    expect(send).toHaveBeenLastCalledWith({ pullRequestUrl }, 'COMPLETE');
    expect(send.mock.calls.some(([, status]) => status === 'ERROR')).toBe(false);
    expect(result).not.toBe(false);
    expect(mocks.removeWorktree).toHaveBeenCalled();

    if (_provider === 'GitHub') {
      expect(mocks.githubRequest).toHaveBeenCalledOnce();
      // Keep the action's existing return value while the completion event
      // carries the browser-facing URL rather than the REST API URL.
      expect(result).toBe(apiUrl);
    } else {
      expect(mocks.createPullRequest).toHaveBeenCalledOnce();
    }
  });

  test('still refuses to erase an existing page with an empty body', async () => {
    const send = vi.fn();
    const result = await workflow.action(send, sourceOptions, workflowOptions, route, {
      user,
      markdown: '',
      frontmatter: 'title: Existing section'
    });

    expect(result).toBe(false);
    expect(send).toHaveBeenCalledWith(expect.any(String), 'ERROR');
    expect(mocks.init).not.toHaveBeenCalled();
  });

  test('uses separate worktrees for simultaneous saves by the same editor', async () => {
    await Promise.all(
      [route, '/docs/another-section.mdx'].map(filePath =>
        workflow.action(vi.fn(), sourceOptions, workflowOptions, filePath, {
          user,
          markdown: 'New page',
          frontmatter: 'title: New section',
          isNewPage: true
        })
      )
    );

    expect(mocks.createWorktree).toHaveBeenCalledTimes(2);
    const [[firstId, firstBranch], [secondId, secondBranch]] = mocks.createWorktree.mock.calls;
    expect(firstId).not.toBe(secondId);
    expect(firstBranch).toBe(`editor-${firstId}`);
    expect(secondBranch).toBe(`editor-${secondId}`);
    expect(mocks.removeWorktree).toHaveBeenCalledWith(firstId);
    expect(mocks.removeWorktree).toHaveBeenCalledWith(secondId);
  });
});

test('cleans up the GitHub worktree when reading an existing page fails', async () => {
  await expect(
    GitHubPullRequestWorkflow.action(
      vi.fn(),
      sourceOptions,
      GitHubPullRequestWorkflow.options,
      route,
      { user, markdown: 'An edit' }
    )
  ).rejects.toThrow(/ENOENT/);

  const [[worktreeId]] = mocks.createWorktree.mock.calls;
  expect(mocks.removeWorktree).toHaveBeenCalledWith(worktreeId);
  expect(mocks.githubRequest).not.toHaveBeenCalled();
});
