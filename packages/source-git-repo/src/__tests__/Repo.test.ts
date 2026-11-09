import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import Repo from '../Repo';
import GitRepoSource from '../index';

const HOUR_MS = 60 * 60 * 1000;

function git(cwd: string, ...args: string[]) {
  return execFileSync(
    'git',
    ['-c', 'user.name=Mosaic Test', '-c', 'user.email=test@example.com', ...args],
    { cwd, stdio: 'pipe' }
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
    fs.rmSync(projectDir, { recursive: true, force: true });
    fs.rmSync(path.join(process.cwd(), '.tmp/.cloned_docs', path.basename(projectDir)), {
      recursive: true,
      force: true
    });
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

  test('THEN separate save worktrees retain their edits and cleanup preserves the source', async () => {
    const secondRepo = new Repo(
      '',
      'origin',
      'main',
      pathToFileURL(path.join(projectDir, 'docs.git')).href
    );
    await Promise.all([repo.init(), secondRepo.init()]);
    const sourceDir = repo.dir;

    await Promise.all([
      repo.createWorktree('save-first', 'editor-first'),
      secondRepo.createWorktree('save-second', 'editor-second')
    ]);
    const firstDir = repo.dir;
    const secondDir = secondRepo.dir;
    try {
      fs.writeFileSync(path.join(firstDir, 'index.mdx'), '# First edit');
      fs.writeFileSync(path.join(secondDir, 'index.mdx'), '# Second edit');
      await Promise.all([repo.addChanges(), secondRepo.addChanges()]);
      await Promise.all([
        repo.commitChanges('First Editor', 'first@example.test', 'First save'),
        secondRepo.commitChanges('Second Editor', 'second@example.test', 'Second save')
      ]);
      expect(git(firstDir, 'show', 'HEAD:index.mdx').trim()).toBe('# First edit');
      expect(git(secondDir, 'show', 'HEAD:index.mdx').trim()).toBe('# Second edit');
      expect(git(firstDir, 'log', '-1', '--format=%ae/%ce').trim()).toBe(
        'first@example.test/first@example.test'
      );
      expect(git(secondDir, 'log', '-1', '--format=%ae/%ce').trim()).toBe(
        'second@example.test/second@example.test'
      );

      await repo.removeWorktree('save-first');
      await repo.removeWorktree('save-first');
      expect(fs.existsSync(firstDir)).toBe(false);
      expect(fs.readFileSync(path.join(sourceDir, 'index.mdx'), 'utf8')).toBe('# Index');
      expect(fs.readFileSync(path.join(secondDir, 'index.mdx'), 'utf8')).toBe('# Second edit');
    } finally {
      await Promise.all([
        repo.removeWorktree('save-first'),
        secondRepo.removeWorktree('save-second')
      ]);
    }
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
