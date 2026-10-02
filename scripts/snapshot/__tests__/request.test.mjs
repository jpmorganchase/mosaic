import { describe, expect, it, vi } from 'vitest';

import {
  checkPullRequest,
  checkSnapshotDispatch,
  formatSnapshotReport,
  hasWriteAccess,
  isSnapshotCommand,
  reportSnapshotRelease,
  requestSnapshotRelease,
  wantsDryRun
} from '../request.mjs';

const REPO = 'jpmorganchase/mosaic';
const SHA = 'a'.repeat(40);

function pullRequest(overrides = {}) {
  return {
    state: 'open',
    head: { sha: SHA, repo: { full_name: REPO } },
    ...overrides
  };
}

function mockGithub({ permission = 'write', permissionError, pr = pullRequest(), prError } = {}) {
  return {
    rest: {
      repos: {
        getCollaboratorPermissionLevel: vi.fn(async () => {
          if (permissionError) throw permissionError;
          return { data: { permission } };
        })
      },
      pulls: {
        get: vi.fn(async () => {
          if (prError) throw prError;
          return { data: pr };
        })
      },
      issues: { createComment: vi.fn(async () => ({})) },
      reactions: { createForIssueComment: vi.fn(async () => ({})) },
      actions: { createWorkflowDispatch: vi.fn(async () => ({})) }
    }
  };
}

function commentContext({
  body = '/snapshot-release',
  login = 'someone',
  onPullRequest = true
} = {}) {
  return {
    repo: { owner: 'jpmorganchase', repo: 'mosaic' },
    serverUrl: 'https://github.com',
    runId: 42,
    payload: {
      comment: { id: 1001, body, user: { login } },
      issue: { number: 7, ...(onPullRequest ? { pull_request: { url: 'x' } } : {}) },
      repository: { default_branch: 'main' }
    }
  };
}

function mockCore() {
  return { info: vi.fn(), setFailed: vi.fn() };
}

describe('isSnapshotCommand', () => {
  it.each([
    '/snapshot-release',
    '/snapshot-release please',
    '/snapshot-release\nthanks',
    '/release-pr',
    '/release-pr\tnow'
  ])('accepts %j', body => expect(isSnapshotCommand(body)).toBe(true));

  it.each([
    '/snapshot-releases',
    ' /snapshot-release',
    'please /snapshot-release',
    '/release-pr2',
    '',
    undefined
  ])('ignores %j', body => expect(isSnapshotCommand(body)).toBe(false));
});

describe('wantsDryRun', () => {
  it('reads --dry-run from the command line only', () => {
    expect(wantsDryRun('/snapshot-release --dry-run')).toBe(true);
    expect(wantsDryRun('/snapshot-release   --dry-run please')).toBe(true);
    expect(wantsDryRun('/snapshot-release')).toBe(false);
    expect(wantsDryRun('/snapshot-release --dry-runs')).toBe(false);
    expect(wantsDryRun('/snapshot-release\nnot --dry-run')).toBe(false);
  });
});

describe('hasWriteAccess', () => {
  it.each(['admin', 'maintain', 'write'])('allows %s', permission =>
    expect(hasWriteAccess(permission)).toBe(true)
  );

  it.each(['triage', 'read', 'none', undefined])('refuses %s', permission =>
    expect(hasWriteAccess(permission)).toBe(false)
  );
});

describe('checkPullRequest', () => {
  it('accepts an open pull request from this repository', () => {
    expect(checkPullRequest(pullRequest(), REPO)).toEqual({ ok: true, sha: SHA });
  });

  it('refuses closed pull requests', () => {
    expect(checkPullRequest(pullRequest({ state: 'closed' }), REPO).ok).toBe(false);
  });

  it('refuses forks, including deleted ones', () => {
    const fork = pullRequest({ head: { sha: SHA, repo: { full_name: 'someone/mosaic' } } });
    const deletedFork = pullRequest({ head: { sha: SHA, repo: null } });
    expect(checkPullRequest(fork, REPO).ok).toBe(false);
    expect(checkPullRequest(deletedFork, REPO).ok).toBe(false);
  });
});

describe('requestSnapshotRelease', () => {
  it('dispatches release.yml for a commenter with write access', async () => {
    const github = mockGithub({ permission: 'write' });
    const core = mockCore();

    const result = await requestSnapshotRelease({ github, context: commentContext(), core });

    expect(result).toEqual({ requested: true, sha: SHA, dryRun: false });
    expect(github.rest.repos.getCollaboratorPermissionLevel).toHaveBeenCalledWith({
      owner: 'jpmorganchase',
      repo: 'mosaic',
      username: 'someone'
    });
    expect(github.rest.actions.createWorkflowDispatch).toHaveBeenCalledWith({
      owner: 'jpmorganchase',
      repo: 'mosaic',
      workflow_id: 'release.yml',
      ref: 'main',
      inputs: { pull_request: '7', sha: SHA, comment_id: '1001', dry_run: 'false' }
    });
    expect(github.rest.reactions.createForIssueComment).toHaveBeenCalledWith(
      expect.objectContaining({ comment_id: 1001, content: 'eyes' })
    );
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('passes --dry-run on to the release run', async () => {
    const github = mockGithub();
    const result = await requestSnapshotRelease({
      github,
      context: commentContext({ body: '/snapshot-release --dry-run' }),
      core: mockCore()
    });
    expect(result.dryRun).toBe(true);
    expect(github.rest.actions.createWorkflowDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ inputs: expect.objectContaining({ dry_run: 'true' }) })
    );
    expect(github.rest.issues.createComment).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.stringContaining('dry run requested') })
    );
  });

  it('dispatches for admins', async () => {
    const github = mockGithub({ permission: 'admin' });
    await requestSnapshotRelease({ github, context: commentContext(), core: mockCore() });
    expect(github.rest.actions.createWorkflowDispatch).toHaveBeenCalledTimes(1);
  });

  it.each(['read', 'triage', 'none'])(
    'never dispatches for a commenter with %s permission',
    async permission => {
      const github = mockGithub({ permission });
      const core = mockCore();

      const result = await requestSnapshotRelease({ github, context: commentContext(), core });

      expect(result.requested).toBe(false);
      expect(github.rest.actions.createWorkflowDispatch).not.toHaveBeenCalled();
      expect(github.rest.pulls.get).not.toHaveBeenCalled();
      expect(github.rest.issues.createComment).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.stringContaining('needs write access') })
      );
      expect(core.setFailed).toHaveBeenCalled();
    }
  );

  it('never dispatches when the permission check fails', async () => {
    const github = mockGithub({
      permissionError: Object.assign(new Error('Not Found'), { status: 404 })
    });
    const core = mockCore();

    const result = await requestSnapshotRelease({ github, context: commentContext(), core });

    expect(result.requested).toBe(false);
    expect(github.rest.actions.createWorkflowDispatch).not.toHaveBeenCalled();
    expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('could not check'));
  });

  it('never dispatches for a fork, even for a writer', async () => {
    const github = mockGithub({
      pr: pullRequest({ head: { sha: SHA, repo: { full_name: 'someone/mosaic' } } })
    });

    const result = await requestSnapshotRelease({
      github,
      context: commentContext(),
      core: mockCore()
    });

    expect(result.requested).toBe(false);
    expect(github.rest.actions.createWorkflowDispatch).not.toHaveBeenCalled();
  });

  it('never dispatches for a closed pull request', async () => {
    const github = mockGithub({ pr: pullRequest({ state: 'closed' }) });
    await requestSnapshotRelease({ github, context: commentContext(), core: mockCore() });
    expect(github.rest.actions.createWorkflowDispatch).not.toHaveBeenCalled();
  });

  it('ignores comments on issues and comments that are not commands', async () => {
    for (const context of [
      commentContext({ onPullRequest: false }),
      commentContext({ body: 'can someone run /snapshot-release?' })
    ]) {
      const github = mockGithub();
      const result = await requestSnapshotRelease({ github, context, core: mockCore() });
      expect(result.requested).toBe(false);
      expect(github.rest.repos.getCollaboratorPermissionLevel).not.toHaveBeenCalled();
      expect(github.rest.actions.createWorkflowDispatch).not.toHaveBeenCalled();
      expect(github.rest.issues.createComment).not.toHaveBeenCalled();
    }
  });
});

describe('checkSnapshotDispatch', () => {
  const context = commentContext();

  it('returns the head commit of a valid pull request', async () => {
    const github = mockGithub();
    await expect(
      checkSnapshotDispatch({ github, context, pullRequest: '7', expectedSha: SHA })
    ).resolves.toEqual({ ok: true, sha: SHA });
    await expect(checkSnapshotDispatch({ github, context, pullRequest: '7' })).resolves.toEqual({
      ok: true,
      sha: SHA
    });
  });

  it('stops when the pull request moved after the request', async () => {
    const result = await checkSnapshotDispatch({
      github: mockGithub(),
      context,
      pullRequest: '7',
      expectedSha: 'b'.repeat(40)
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('moved');
  });

  it('rejects malformed inputs without calling GitHub', async () => {
    const github = mockGithub();
    for (const input of [
      { pullRequest: '7; rm -rf /' },
      { pullRequest: '' },
      { pullRequest: '7', expectedSha: 'main' }
    ]) {
      expect((await checkSnapshotDispatch({ github, context, ...input })).ok).toBe(false);
    }
    expect(github.rest.pulls.get).not.toHaveBeenCalled();
  });

  it('refuses forks and closed pull requests', async () => {
    const fork = mockGithub({
      pr: pullRequest({ head: { sha: SHA, repo: { full_name: 'someone/mosaic' } } })
    });
    const closed = mockGithub({ pr: pullRequest({ state: 'closed' }) });
    expect((await checkSnapshotDispatch({ github: fork, context, pullRequest: '7' })).ok).toBe(
      false
    );
    expect((await checkSnapshotDispatch({ github: closed, context, pullRequest: '7' })).ok).toBe(
      false
    );
  });

  it('fails when the pull request cannot be read', async () => {
    const github = mockGithub({ prError: Object.assign(new Error('Not Found'), { status: 404 }) });
    const result = await checkSnapshotDispatch({ github, context, pullRequest: '7' });
    expect(result).toEqual({ ok: false, reason: expect.stringContaining('404') });
  });
});

describe('formatSnapshotReport', () => {
  const base = { sha: SHA, runUrl: 'https://example.test/run' };

  it('lists install commands after a publish', () => {
    const body = formatSnapshotReport({
      ...base,
      result: 'success',
      published: ['@jpmorganchase/mosaic-types@0.0.0-snapshot-20261002090000'],
      dryRun: false
    });
    expect(body).toContain('Snapshot release published');
    expect(body).toContain('yarn add @jpmorganchase/mosaic-types@0.0.0-snapshot-20261002090000');
  });

  it('says nothing was published after a dry run', () => {
    const body = formatSnapshotReport({
      ...base,
      result: 'success',
      published: ['@jpmorganchase/mosaic-types@0.0.0-snapshot-20261002090000'],
      dryRun: true
    });
    expect(body).toContain('Nothing was published');
    expect(body).not.toContain('yarn add');
  });

  it('links the run after a failure', () => {
    const body = formatSnapshotReport({ ...base, result: 'failure', published: [], dryRun: false });
    expect(body).toContain('Snapshot release failed');
    expect(body).toContain('https://example.test/run');
  });
});

describe('reportSnapshotRelease', () => {
  const context = commentContext();

  it('comments and reacts with a rocket after a publish', async () => {
    const github = mockGithub();
    await reportSnapshotRelease({
      github,
      context,
      core: mockCore(),
      pullRequest: '7',
      commentId: '1001',
      sha: SHA,
      result: 'success',
      published: '@jpmorganchase/mosaic-types@0.0.0-snapshot-20261002090000\n',
      dryRun: false
    });
    expect(github.rest.issues.createComment).toHaveBeenCalledWith(
      expect.objectContaining({ issue_number: 7, body: expect.stringContaining('published') })
    );
    expect(github.rest.reactions.createForIssueComment).toHaveBeenCalledWith(
      expect.objectContaining({ comment_id: 1001, content: 'rocket' })
    );
  });

  it('reports a failure when the publish job failed or published nothing', async () => {
    for (const outcome of [
      { result: 'failure', published: '' },
      { result: 'skipped', published: '' },
      { result: 'success', published: '' }
    ]) {
      const github = mockGithub();
      await reportSnapshotRelease({
        github,
        context,
        core: mockCore(),
        pullRequest: '7',
        commentId: '1001',
        sha: SHA,
        dryRun: false,
        ...outcome
      });
      expect(github.rest.issues.createComment).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.stringContaining('failed') })
      );
      expect(github.rest.reactions.createForIssueComment).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'confused' })
      );
    }
  });

  it('skips the reaction for manual runs and does nothing for a malformed pull request', async () => {
    const github = mockGithub();
    await reportSnapshotRelease({
      github,
      context,
      core: mockCore(),
      pullRequest: '7',
      commentId: '',
      sha: SHA,
      result: 'failure',
      published: '',
      dryRun: false
    });
    expect(github.rest.reactions.createForIssueComment).not.toHaveBeenCalled();

    const untouched = mockGithub();
    await reportSnapshotRelease({
      github: untouched,
      context,
      core: mockCore(),
      pullRequest: 'not-a-number',
      result: 'failure',
      published: '',
      dryRun: false
    });
    expect(untouched.rest.issues.createComment).not.toHaveBeenCalled();
  });
});
