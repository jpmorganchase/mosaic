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

  test('uses the exact author message for the commit and its first line for the prefixed PR title', async () => {
    await workflow.action(
      vi.fn(),
      sourceOptions,
      { ...workflowOptions, titlePrefix: 'Docs' },
      route,
      {
        user,
        markdown: 'New page',
        frontmatter: 'title: New',
        isNewPage: true,
        commitMessage: 'Explain the change\r\n\r\nDetailed updated content explanation.'
      }
    );
    const message = 'Explain the change\n\nDetailed updated content explanation.';
    if (_provider === 'GitHub') {
      expect(mocks.commitChanges).toHaveBeenCalledWith(user.name, user.email, message);
      expect(mocks.githubRequest.mock.calls[0][1]).toMatchObject({
        title: 'Docs - Explain the change',
        body: message
      });
    } else {
      expect(mocks.createPullRequest.mock.calls[0][5]).toBe(message);
      expect(JSON.parse(mocks.createPullRequest.mock.calls[0][4]).title).toBe(
        'Docs - Explain the change'
      );
    }
  });

  test('bounds a long provider title while retaining the full author commit message', async () => {
    const message = `${'Detailed summary '.repeat(30)}\n\nFull commit body.`;
    const send = vi.fn();
    await workflow.action(send, sourceOptions, { ...workflowOptions, titlePrefix: 'Docs' }, route, {
      user,
      markdown: 'New page',
      frontmatter: 'title: New',
      isNewPage: true,
      commitMessage: message
    });
    const title =
      _provider === 'GitHub'
        ? mocks.githubRequest.mock.calls[0][1].title
        : JSON.parse(mocks.createPullRequest.mock.calls[0][4]).title;
    expect(title.length).toBeLessThanOrEqual(255);
    expect(title).toMatch(/^Docs - Detailed summary /);
    expect(title.endsWith('…')).toBe(true);
    if (_provider === 'GitHub') {
      expect(mocks.commitChanges).toHaveBeenCalledWith(user.name, user.email, message);
      expect(mocks.githubRequest.mock.calls[0][1].body).toBe(message);
    } else {
      expect(mocks.createPullRequest.mock.calls[0][5]).toBe(message);
    }
    expect(send).toHaveBeenLastCalledWith({ pullRequestUrl }, 'COMPLETE');
  });

  test('inspects configured defaults without initializing Git or mutating the workflow export', async () => {
    const configured = vi.fn(() => 'custom updated content');
    expect(
      await workflow.prepare(
        sourceOptions,
        { ...workflowOptions, commitMessage: configured },
        route,
        { isNewPage: true }
      )
    ).toEqual({ supportsCommitMessage: true, commitMessage: 'custom updated content' });
    expect(configured).toHaveBeenCalledWith(route, { action: 'create' });
    expect(mocks.init).not.toHaveBeenCalled();
    expect(mocks.createWorktree).not.toHaveBeenCalled();
    expect(mocks.githubRequest).not.toHaveBeenCalled();
    expect(mocks.createPullRequest).not.toHaveBeenCalled();
  });

  test.each(['', ' \n ', 'invalid\0message', 'é'.repeat(4097), 123])(
    'rejects invalid overrides before Git writes',
    async commitMessage => {
      const send = vi.fn();
      expect(
        await workflow.action(send, sourceOptions, workflowOptions, route, {
          user,
          markdown: 'New page',
          frontmatter: 'title: New',
          isNewPage: true,
          commitMessage
        })
      ).toBe(false);
      expect(send).toHaveBeenCalledWith(expect.any(String), 'ERROR');
      expect(mocks.init).not.toHaveBeenCalled();
      expect(mocks.createWorktree).not.toHaveBeenCalled();
    }
  );
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
