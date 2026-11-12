import { execFileSync, type SpawnOptions } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as lockfile from 'proper-lockfile';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import Repo from '../Repo';
import GitRepoSource from '../index';

vi.mock('child_process', async importOriginal => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    default: {
      ...actual,
      spawn(command: string, args: readonly string[], options: SpawnOptions) {
        return actual.spawn(command, args, { ...options, env: fixtureGitEnv(options.env) });
      }
    }
  };
});

vi.mock('proper-lockfile', async importOriginal => {
  const actual = await importOriginal<typeof lockfile>();
  return { ...actual, lock: vi.fn(actual.lock) };
});

const HOUR_MS = 60 * 60 * 1000;

function fixtureGitEnv(env = process.env) {
  // Git must stop before the enclosing checkout if fixture teardown races a child process.
  return { ...env, GIT_CEILING_DIRECTORIES: path.resolve('.tmp') };
}

function git(cwd: string, ...args: string[]) {
  return execFileSync(
    'git',
    ['-c', 'user.name=Mosaic Test', '-c', 'user.email=test@example.com', ...args],
    { cwd, stdio: 'pipe', env: fixtureGitEnv() }
  ).toString();
}

/**
 * Real git end to end: a bare "remote" plus a clone that pushes to it.
 * Everything lives under `<cwd>/.tmp` (gitignored), where `Repo` clones
 * anyway.
 */
describe('GIVEN a Repo subscribed to commit changes', () => {
  let projectDir: string;
  let authorDir: string;
  let repo: Repo;
  let unsubscribe: (() => void) | undefined;

  const push = (file: string, content: string) => {
    fs.writeFileSync(path.join(authorDir, file), content);
    git(authorDir, 'add', '.');
    git(authorDir, 'commit', '-m', `Add ${file}`);
    git(authorDir, 'push', 'origin', 'main');
  };

  beforeEach(() => {
    projectDir = path.join(process.cwd(), '.tmp', `mosaic-refresh-test-${randomUUID()}`);
    const originDir = path.join(projectDir, 'docs.git');
    authorDir = path.join(projectDir, 'author');
    fs.mkdirSync(projectDir, { recursive: true });
    git(projectDir, 'init', '--bare', '--initial-branch=main', originDir);
    git(projectDir, 'clone', originDir, authorDir);
    git(authorDir, 'checkout', '-B', 'main');
    push('index.mdx', '# Index');

    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    repo = new Repo('', 'origin', 'main', pathToFileURL(originDir).href);
  });

  afterEach(() => {
    unsubscribe?.();
    unsubscribe = undefined;
    vi.restoreAllMocks();
    vi.mocked(lockfile.lock).mockReset();
    fs.rmSync(projectDir, { recursive: true, force: true });
    fs.rmSync(path.join(process.cwd(), '.tmp/.cloned_docs', path.basename(projectDir)), {
      recursive: true,
      force: true
    });
  });

  test('THEN a fixture directory without Git metadata cannot reach the enclosing checkout', async () => {
    await repo.init();
    // Both the worktree and its clone can lose their metadata during teardown.
    const cloneRoot = path.resolve('.tmp/.cloned_docs', path.basename(projectDir), 'docs');
    expect(repo.dir).toBe(path.join(cloneRoot, '.mosaic-worktrees', 'main'));
    const cloneGitDir = path.join(cloneRoot, '.git');
    fs.renameSync(cloneGitDir, path.join(cloneRoot, 'git-metadata-backup'));
    fs.unlinkSync(path.join(repo.dir, '.git'));

    await expect(repo.currentLocalRevision()).rejects.toThrow('not a git repository');
  });

  test('THEN `checkForChanges` picks up a push without waiting for the interval', async () => {
    await repo.init();
    const onChange = vi.fn();
    const onError = vi.fn();
    unsubscribe = repo.onCommitChange(onChange, onError, false, HOUR_MS);

    await repo.checkForChanges();
    expect(onChange).not.toHaveBeenCalled();

    push('new-page.mdx', '# New page');
    await repo.checkForChanges();

    expect(onError).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].map(String)).toEqual([path.join(repo.dir, 'new-page.mdx')]);
    expect(fs.readFileSync(path.join(repo.dir, 'new-page.mdx'), 'utf8')).toBe('# New page');
  });

  test('THEN checks requested before subscription run once when a subscriber is ready', async () => {
    await repo.init();
    push('pending.mdx', '# Pending');
    const fetchSpy = vi.spyOn(repo, 'fetch');

    await Promise.all([repo.checkForChanges(), repo.checkForChanges()]);
    expect(fetchSpy).not.toHaveBeenCalled();

    const onChange = vi.fn();
    unsubscribe = repo.onCommitChange(onChange, vi.fn(), false, HOUR_MS);

    await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fs.readFileSync(path.join(repo.dir, 'pending.mdx'), 'utf8')).toBe('# Pending');
  });

  test('THEN a queued refresh survives failed initialization and runs after retry', async () => {
    const initError = new Error('Failed to configure clone');
    let finishConfigure!: () => void;
    const configuring = new Promise<void>(resolve => {
      finishConfigure = resolve;
    });
    const configure = vi
      .spyOn(repo, 'ensureSingleBranchFetchRefspec')
      .mockImplementationOnce(async () => {
        await configuring;
        throw initError;
      });
    const check = vi.spyOn(repo, 'checkForChanges');
    const onChange = vi.fn();
    const onError = vi.fn();

    await repo.checkForChanges();
    const failed = expect(repo.init()).rejects.toThrow(initError);
    try {
      await vi.waitFor(() => expect(configure).toHaveBeenCalledTimes(1), { timeout: 3000 });
      push('pending.mdx', '# Pending');
      unsubscribe = repo.onCommitChange(onChange, onError, false, HOUR_MS);
      expect(check).toHaveBeenCalledTimes(1);
    } finally {
      finishConfigure();
      await failed;
    }

    await repo.init();
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(onError).not.toHaveBeenCalled();
    expect(fs.readFileSync(path.join(repo.dir, 'pending.mdx'), 'utf8')).toBe('# Pending');
  });

  test('THEN a refresh waiting for the lock is queued again after reinitialization fails', async () => {
    await repo.init();
    const onError = vi.fn();
    unsubscribe = repo.onCommitChange(vi.fn(), onError, false, HOUR_MS);
    const check = vi.spyOn(repo, 'checkForChanges');
    const fetch = vi.spyOn(repo, 'fetch');
    const initError = new Error('Failed to reconfigure clone');
    vi.spyOn(repo, 'ensureSingleBranchFetchRefspec').mockRejectedValueOnce(initError);

    let resumeCheck!: () => void;
    const waiting = new Promise<void>(resolve => {
      resumeCheck = resolve;
    });
    const { lock: acquire } = await vi.importActual<typeof lockfile>('proper-lockfile');
    vi.mocked(lockfile.lock).mockImplementationOnce(async (...args) => {
      await waiting;
      return acquire(...args);
    });

    const checking = repo.checkForChanges();
    try {
      await expect(repo.init()).rejects.toThrow(initError);
    } finally {
      resumeCheck();
      await checking;
    }
    expect(fetch).not.toHaveBeenCalled();

    await repo.init();
    expect(check).toHaveBeenCalledTimes(2);
    await check.mock.results[1].value;
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  test('THEN checks requested while one is running are coalesced into one more check', async () => {
    await repo.init();
    const fetchSpy = vi.spyOn(repo, 'fetch');
    unsubscribe = repo.onCommitChange(vi.fn(), vi.fn(), false, HOUR_MS);

    await Promise.all([
      repo.checkForChanges(),
      repo.checkForChanges(),
      repo.checkForChanges(),
      repo.checkForChanges()
    ]);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test('THEN separate instances can refresh the same checkout concurrently', async () => {
    const second = new Repo(
      '',
      'origin',
      'main',
      pathToFileURL(path.join(projectDir, 'docs.git')).href
    );
    await Promise.all([repo.init(), second.init()]);
    expect(second.dir).toBe(repo.dir);
    const onError = vi.fn();
    unsubscribe = repo.onCommitChange(vi.fn(), onError, false, HOUR_MS);
    const unsubscribeSecond = second.onCommitChange(vi.fn(), onError, false, HOUR_MS);
    try {
      push('shared-page.mdx', '# Shared page');
      await Promise.all([repo.checkForChanges(), second.checkForChanges()]);
      expect(onError).not.toHaveBeenCalled();
      expect(fs.readFileSync(path.join(repo.dir, 'shared-page.mdx'), 'utf8')).toBe('# Shared page');
    } finally {
      unsubscribeSecond();
    }
  }, 15_000);

  test('THEN a failed on-demand fetch is reported to the caller', async () => {
    await repo.init();
    const failure = new Error('Fetch failed');
    vi.spyOn(repo, 'fetch').mockRejectedValue(failure);
    const onError = vi.fn();
    unsubscribe = repo.onCommitChange(vi.fn(), onError, false, HOUR_MS);
    await expect(repo.checkForChanges()).rejects.toThrow(failure);
    expect(onError).toHaveBeenCalledWith(failure);
  });

  test('THEN `checkForChanges` does nothing once unsubscribed', async () => {
    await repo.init();
    const fetchSpy = vi.spyOn(repo, 'fetch');
    const onChange = vi.fn();
    repo.onCommitChange(onChange, vi.fn(), false, HOUR_MS)();

    push('new-page.mdx', '# New page');
    await repo.checkForChanges();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  test('THEN `checkForChanges` does nothing before the repository is cloned', async () => {
    const fetchSpy = vi.spyOn(repo, 'fetch');
    unsubscribe = repo.onCommitChange(vi.fn(), vi.fn(), false, HOUR_MS);

    await repo.checkForChanges();

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('GIVEN the git-repo source', () => {
  const options = {
    credentials: 'user:token',
    remote: 'origin',
    branch: 'main',
    repo: 'https://bitbucket.example.com/scm/proj/refresh-hook-test.git',
    subfolder: 'docs',
    prefixDir: 'docs',
    extensions: ['.mdx'] as [string, ...string[]],
    disableAutoPullChanges: false
  };
  const helpers = {
    serialiser: { serialise: vi.fn(), deserialise: vi.fn() },
    pageExtensions: ['.mdx'],
    schedule: { checkIntervalMins: 30, initialDelayMs: 0 }
  } as never;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('THEN `refresh` checks the repository the source was created for', async () => {
    const checkSpy = vi.spyOn(Repo.prototype, 'checkForChanges').mockResolvedValue();
    GitRepoSource.create(options, helpers);

    await GitRepoSource.refresh?.(options);

    expect(checkSpy).toHaveBeenCalledTimes(1);
  });

  test('THEN `refresh` ignores a repository no source was created for', async () => {
    const checkSpy = vi.spyOn(Repo.prototype, 'checkForChanges').mockResolvedValue();

    await GitRepoSource.refresh?.({ ...options, branch: 'not-created' });

    expect(checkSpy).not.toHaveBeenCalled();
  });
});
