import { execFileSync, type SpawnOptions } from 'node:child_process';
import cp from 'child_process';
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
  const fixtureTasks = new Set<Promise<void>>();

  // A timed-out test can still be awaiting Git. Keep its entire task, including
  // its finally block, alive until teardown can safely remove the fixture.
  const runFixtureTask = (task: () => Promise<void>) => {
    const running = task();
    fixtureTasks.add(running);
    return running.finally(() => fixtureTasks.delete(running));
  };

  const finishFixtureOperations = async (operations: Promise<unknown>[]) => {
    // Promise.all rejects before its other Git processes finish.
    const results = await Promise.allSettled(operations);
    for (const result of results) {
      if (result.status === 'rejected') throw result.reason;
    }
  };

  const push = (file: string, content: string) => {
    fs.writeFileSync(path.join(authorDir, file), content);
    git(authorDir, 'add', '.');
    git(authorDir, 'commit', '-m', `Add ${file}`);
    git(authorDir, 'push', 'origin', 'main');
  };

  // Leaves the clone in place, as when only `.mosaic-worktrees/<branch>` is deleted.
  const removeSourceWorktree = () => {
    const cloneRoot = path.dirname(path.dirname(repo.dir));
    fs.rmSync(repo.dir, { recursive: true, force: true });
    git(cloneRoot, 'worktree', 'prune');
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

  afterEach(async () => {
    const fixtureDir = projectDir;
    const cloneDir = path.resolve('.tmp/.cloned_docs', path.basename(fixtureDir));
    const pendingTasks = [...fixtureTasks];
    unsubscribe?.();
    unsubscribe = undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        Promise.allSettled(pendingTasks),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`Git task did not settle; retaining fixture ${fixtureDir}`)),
            20_000
          );
        })
      ]);
    } finally {
      clearTimeout(timer);
      vi.restoreAllMocks();
      vi.mocked(lockfile.lock).mockReset();
    }
    expect(path.dirname(fixtureDir)).toBe(path.resolve('.tmp'));
    expect(path.dirname(cloneDir)).toBe(path.resolve('.tmp/.cloned_docs'));
    const removeOptions = {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100
    };
    await fs.promises.rm(fixtureDir, removeOptions);
    await fs.promises.rm(cloneDir, removeOptions);
  }, 30_000);

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

  test('THEN timestamp batches pin both bulk and fallback queries to their captured revision', async () => {
    await repo.init();
    const revision = await repo.currentLocalRevision();
    const expected =
      Number(git(repo.dir, 'log', '-1', '--format=%ct', revision!, '--', 'index.mdx').trim()) *
      1000;
    const commands = vi.spyOn(cp, 'spawn');
    const dates = await repo.getLatestCommitDateMap('.', revision);
    expect(dates.get('index.mdx')).toBe(expected);
    expect(await repo.getLatestCommitDate('index.mdx', revision)).toBe(expected);
    expect(commands.mock.calls.filter(([, args]) => args?.[0] === 'rev-parse')).toHaveLength(0);
    expect(commands.mock.calls.filter(([, args]) => args?.[0] === 'log')).toHaveLength(1);

    repo.invalidateCommitDateCache();
    expect(await repo.getLatestCommitDate('index.mdx', revision)).toBe(expected);
    expect(commands.mock.calls.at(-1)?.[1]).toEqual([
      'log',
      '-1',
      '--format=%ct',
      revision,
      '--',
      'index.mdx'
    ]);
    const before = Date.now();
    expect(await repo.getLatestCommitDate('missing.mdx', revision)).toBeGreaterThanOrEqual(before);
  });

  test('THEN the timestamp cache does not reuse a prior revision after HEAD advances', async () => {
    await repo.init();
    const revision = await repo.currentLocalRevision();
    await repo.getLatestCommitDateMap('.', revision);
    push('index.mdx', '# Updated');
    await repo.fetch();
    await repo.reset();
    const commands = vi.spyOn(cp, 'spawn');
    const expected =
      Number(git(repo.dir, 'log', '-1', '--format=%ct', '--', 'index.mdx').trim()) * 1000;
    expect(await repo.getLatestCommitDate('index.mdx')).toBe(expected);
    const current = await repo.currentLocalRevision();
    expect(current).not.toBe(revision);
    expect(
      commands.mock.calls.some(([, args]) => args?.[0] === 'log' && args.includes(current!))
    ).toBe(true);
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

    const fetch = vi.spyOn(repo, 'fetch');
    await repo.init();
    // The retry fetches before creating the worktree, so it starts with the push.
    expect(fs.readFileSync(path.join(repo.dir, 'pending.mdx'), 'utf8')).toBe('# Pending');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(check).toHaveBeenCalledTimes(2);
    await check.mock.results[1].value;
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(onChange).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
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

  test.each(['origin', 'upstream'])(
    'THEN a reused clone loads and refreshes a newly published branch from %s',
    remote =>
      runFixtureTask(async () => {
        const url = pathToFileURL(path.join(projectDir, 'docs.git')).href;
        repo = new Repo('', remote, 'main', url);
        await repo.init();
        const mainRevision = await repo.currentLocalRevision();

        const branch = 'docs/new-branch';
        git(authorDir, 'checkout', '-b', branch);
        fs.writeFileSync(path.join(authorDir, 'branch.mdx'), '# Branch');
        git(authorDir, 'add', '.');
        git(authorDir, 'commit', '-m', 'Publish branch');
        git(authorDir, 'push', 'origin', branch);

        const branchRepo = new Repo('', remote, branch, url);
        await branchRepo.init();
        expect(await branchRepo.currentLocalRevision()).toBe(
          git(authorDir, 'rev-parse', 'HEAD').trim()
        );
        expect(fs.readFileSync(path.join(branchRepo.dir, 'branch.mdx'), 'utf8')).toBe('# Branch');
        expect(await repo.currentLocalRevision()).toBe(mainRevision);
        // Refreshes name `<remote>/<branch>`, so the shared config needs no upstream.
        expect(git(branchRepo.dir, 'config', '--local', '--list')).not.toContain(
          `branch.${branch}.`
        );

        const onMainChange = vi.fn();
        const onBranchChange = vi.fn();
        const onError = vi.fn();
        unsubscribe = repo.onCommitChange(onMainChange, onError, false, HOUR_MS);
        const stopBranch = branchRepo.onCommitChange(onBranchChange, onError, false, HOUR_MS);
        try {
          fs.writeFileSync(path.join(authorDir, 'branch.mdx'), '# Updated branch');
          git(authorDir, 'add', '.');
          git(authorDir, 'commit', '-m', 'Update branch');
          git(authorDir, 'push', 'origin', branch);
          git(authorDir, 'checkout', 'main');
          push('main.mdx', '# Updated main');

          await finishFixtureOperations([repo.checkForChanges(), branchRepo.checkForChanges()]);

          expect(onError).not.toHaveBeenCalled();
          expect(onMainChange).toHaveBeenCalledTimes(1);
          expect(onBranchChange).toHaveBeenCalledTimes(1);
          expect(fs.readFileSync(path.join(repo.dir, 'main.mdx'), 'utf8')).toBe('# Updated main');
          expect(fs.existsSync(path.join(repo.dir, 'branch.mdx'))).toBe(false);
          expect(fs.readFileSync(path.join(branchRepo.dir, 'branch.mdx'), 'utf8')).toBe(
            '# Updated branch'
          );
          expect(fs.existsSync(path.join(branchRepo.dir, 'main.mdx'))).toBe(false);
        } finally {
          stopBranch();
        }
      }),
    15_000
  );

  test(
    'THEN a save worktree pushes its branch to the configured remote',
    () =>
      runFixtureTask(async () => {
        const remoteDir = path.join(projectDir, 'docs.git');
        repo = new Repo('', 'upstream', 'main', pathToFileURL(remoteDir).href);
        await repo.init();
        await repo.createWorktree('save-upstream', 'editor-upstream');
        try {
          fs.writeFileSync(path.join(repo.dir, 'index.mdx'), '# Saved remotely');
          await repo.addChanges();
          await repo.commitChanges('Editor', 'editor@example.test', 'Update documentation');
          await repo.pushBranch('editor-upstream');
          expect(git(remoteDir, 'show', 'refs/heads/editor-upstream:index.mdx')).toBe(
            '# Saved remotely'
          );
        } finally {
          await repo.removeWorktree('save-upstream');
        }
      }),
    15_000
  );

  test(
    'THEN initialization of a missing remote branch fails and can be retried after publication',
    () =>
      runFixtureTask(async () => {
        await repo.init();
        const mainRevision = await repo.currentLocalRevision();
        const branch = 'published-later';
        const branchRepo = new Repo(
          '',
          'origin',
          branch,
          pathToFileURL(path.join(projectDir, 'docs.git')).href
        );

        await expect(branchRepo.init()).rejects.toThrow();
        expect(fs.existsSync(branchRepo.dir)).toBe(false);
        expect(await repo.currentLocalRevision()).toBe(mainRevision);

        git(authorDir, 'push', 'origin', `HEAD:refs/heads/${branch}`);
        await branchRepo.init();
        expect(await branchRepo.currentLocalRevision()).toBe(mainRevision);
        expect(git(branchRepo.dir, 'branch', '--show-current').trim()).toBe(branch);
      }),
    15_000
  );

  test('THEN a new branch worktree is created while the clone config is locked', async () => {
    await repo.init();
    const cloneRoot = path.dirname(path.dirname(repo.dir));
    const branch = 'published-later';
    git(authorDir, 'checkout', '-b', branch);
    fs.writeFileSync(path.join(authorDir, 'branch.mdx'), '# Branch');
    git(authorDir, 'add', '.');
    git(authorDir, 'commit', '-m', 'Publish branch');
    git(authorDir, 'push', 'origin', branch);
    const branchRepo = new Repo(
      '',
      'origin',
      branch,
      pathToFileURL(path.join(projectDir, 'docs.git')).href
    );

    // As when a concurrent save holds `.git/config`: the fetch refspec still maps
    // only `main`, and no upstream can be recorded for the new branch.
    const configLock = path.join(cloneRoot, '.git', 'config.lock');
    fs.writeFileSync(configLock, '');
    try {
      await branchRepo.init();
    } finally {
      fs.rmSync(configLock, { force: true });
    }

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not narrow fetch refspec')
    );
    expect(git(cloneRoot, 'config', '--get-all', 'remote.origin.fetch').trim()).toBe(
      '+refs/heads/main:refs/remotes/origin/main'
    );
    expect(await branchRepo.currentLocalRevision()).toBe(
      git(authorDir, 'rev-parse', 'HEAD').trim()
    );
    expect(git(branchRepo.dir, 'branch', '--show-current').trim()).toBe(branch);
    expect(fs.readFileSync(path.join(branchRepo.dir, 'branch.mdx'), 'utf8')).toBe('# Branch');
  }, 15_000);

  test('THEN a recreated worktree starts from the latest remote commit', async () => {
    await repo.init();
    removeSourceWorktree();
    push('latest.mdx', '# Latest');

    await repo.init();
    expect(await repo.currentLocalRevision()).toBe(git(authorDir, 'rev-parse', 'HEAD').trim());
    expect(git(repo.dir, 'branch', '--show-current').trim()).toBe('main');
    expect(fs.readFileSync(path.join(repo.dir, 'latest.mdx'), 'utf8')).toBe('# Latest');
  });

  test('THEN a reused clone can create a worktree for an already-fetched tag', async () => {
    const tag = 'docs-v1';
    git(authorDir, 'tag', '-a', tag, '-m', 'Docs v1');
    git(authorDir, 'push', 'origin', tag);
    await repo.init();
    const revision = await repo.currentLocalRevision();
    push('newer.mdx', '# After the tag');
    const taggedRepo = new Repo(
      '',
      'origin',
      tag,
      pathToFileURL(path.join(projectDir, 'docs.git')).href
    );

    await taggedRepo.init();

    expect(await taggedRepo.currentLocalRevision()).toBe(revision);
    expect(git(taggedRepo.dir, 'branch', '--show-current').trim()).toBe('');
    expect(fs.existsSync(path.join(taggedRepo.dir, 'newer.mdx'))).toBe(false);
  });

  test('THEN a worktree is recreated from the clone when the remote is unreachable', async () => {
    await repo.init();
    const revision = await repo.currentLocalRevision();
    removeSourceWorktree();
    const originDir = path.join(projectDir, 'docs.git');
    fs.renameSync(originDir, `${originDir}-unreachable`);

    await repo.init();
    expect(await repo.currentLocalRevision()).toBe(revision);
    expect(fs.readFileSync(path.join(repo.dir, 'index.mdx'), 'utf8')).toBe('# Index');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Fetch failed'));
  });

  test(
    'THEN separate save worktrees retain their edits and cleanup preserves the source',
    () =>
      runFixtureTask(async () => {
        const firstRepo = repo;
        const fixtureDir = projectDir;
        const secondRepo = new Repo(
          '',
          'origin',
          'main',
          pathToFileURL(path.join(fixtureDir, 'docs.git')).href
        );
        await finishFixtureOperations([firstRepo.init(), secondRepo.init()]);
        const sourceDir = firstRepo.dir;

        await finishFixtureOperations([
          firstRepo.createWorktree('save-first', 'editor-first'),
          secondRepo.createWorktree('save-second', 'editor-second')
        ]);
        const firstDir = firstRepo.dir;
        const secondDir = secondRepo.dir;
        try {
          fs.writeFileSync(path.join(firstDir, 'index.mdx'), '# First edit');
          fs.writeFileSync(path.join(secondDir, 'index.mdx'), '# Second edit');
          await finishFixtureOperations([firstRepo.addChanges(), secondRepo.addChanges()]);
          const firstMessage = '\n  First save  \n\nBody with trailing spaces.  \n\n';
          await finishFixtureOperations([
            firstRepo.commitChanges('First Editor', 'first@example.test', firstMessage),
            secondRepo.commitChanges('Second Editor', 'second@example.test', 'Second save')
          ]);
          // Inspect the stored commit object, avoiding git log's formatting cleanup.
          expect(
            git(firstDir, 'cat-file', 'commit', 'HEAD').split('\n\n').slice(1).join('\n\n')
          ).toBe(firstMessage);
          // Git adds its structural terminal newline when the input has none.
          expect(
            git(secondDir, 'cat-file', 'commit', 'HEAD').split('\n\n').slice(1).join('\n\n')
          ).toBe('Second save\n');
          expect(git(firstDir, 'show', 'HEAD:index.mdx').trim()).toBe('# First edit');
          expect(git(secondDir, 'show', 'HEAD:index.mdx').trim()).toBe('# Second edit');
          expect(git(firstDir, 'log', '-1', '--format=%ae/%ce').trim()).toBe(
            'first@example.test/first@example.test'
          );
          expect(git(secondDir, 'log', '-1', '--format=%ae/%ce').trim()).toBe(
            'second@example.test/second@example.test'
          );

          git(sourceDir, 'worktree', 'lock', firstDir);
          await firstRepo.removeWorktree('save-first');
          expect(fs.readFileSync(path.join(firstDir, 'index.mdx'), 'utf8')).toBe('# First edit');
          expect(git(sourceDir, 'worktree', 'list', '--porcelain')).toContain('locked');
          git(sourceDir, 'worktree', 'unlock', firstDir);

          await firstRepo.removeWorktree('save-first');
          await firstRepo.removeWorktree('save-first');
          expect(fs.existsSync(firstDir)).toBe(false);
          expect(git(sourceDir, 'worktree', 'list', '--porcelain')).not.toContain('save-first');
          expect(fs.readFileSync(path.join(sourceDir, 'index.mdx'), 'utf8')).toBe('# Index');
          expect(fs.readFileSync(path.join(secondDir, 'index.mdx'), 'utf8')).toBe('# Second edit');
        } finally {
          await finishFixtureOperations([
            firstRepo.removeWorktree('save-first'),
            secondRepo.removeWorktree('save-second')
          ]);
        }
      }),
    15_000
  );

  test('THEN cleanup removes a worktree left behind by a failed checkout hook', async () => {
    await repo.init();
    const sourceDir = repo.dir;
    const hooksDir = path.join(path.dirname(path.dirname(sourceDir)), '.git', 'hooks');
    fs.writeFileSync(path.join(hooksDir, 'post-checkout'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
    const saveDir = path.join(path.dirname(sourceDir), 'failed-save');

    await expect(repo.createWorktree('failed-save', 'editor-failed-save')).rejects.toThrow();
    expect(fs.existsSync(saveDir)).toBe(true);

    await repo.removeWorktree('failed-save');
    expect(fs.existsSync(saveDir)).toBe(false);
    expect(git(sourceDir, 'worktree', 'list', '--porcelain')).not.toContain('failed-save');
    expect(fs.existsSync(sourceDir)).toBe(true);
  });

  test('THEN cleanup can remove an unregistered save directory', async () => {
    await repo.init();
    const sourceDir = repo.dir;
    await repo.createWorktree('unregistered-save', 'editor-unregistered-save');
    const saveDir = repo.dir;
    git(sourceDir, 'worktree', 'remove', '--force', saveDir);
    fs.mkdirSync(saveDir);

    await repo.removeWorktree('unregistered-save');
    expect(fs.existsSync(saveDir)).toBe(false);
    expect(fs.existsSync(sourceDir)).toBe(true);
  });

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
