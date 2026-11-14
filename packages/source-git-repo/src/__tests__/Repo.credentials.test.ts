import cp from 'child_process';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { afterEach, expect, test, vi } from 'vitest';
import Repo from '../Repo';

vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn().mockRejectedValue(new Error('fixture does not exist')),
    readdir: vi.fn().mockRejectedValue(new Error('fixture does not exist'))
  }
}));
vi.mock('proper-lockfile', () => ({ lock: vi.fn().mockResolvedValue(async () => {}) }));

afterEach(() => vi.restoreAllMocks());

test('Git errors preserve safe diagnostics while scrubbing repeated URLs and echoed credentials', async () => {
  const credential = 'audit-user:synthetic token/@';
  const encodedCredential = credential.split(':').map(encodeURIComponent).join(':');
  const url = `https://${encodedCredential}@example.test/docs.git`;
  vi.spyOn(console, 'debug').mockImplementation(() => {});
  vi.spyOn(cp, 'spawn').mockImplementation(() => {
    const child = Object.assign(new EventEmitter(), {
      stdout: new PassThrough(),
      stderr: new PassThrough()
    });
    queueMicrotask(() => {
      child.stderr.write(
        `fatal: authentication failed ${url} ${url} ${credential} ${encodeURIComponent(
          credential
        )} synthetic token/@`
      );
      child.emit('close', 128);
    });
    return child as ReturnType<typeof cp.spawn>;
  });
  const repo = new Repo(credential, 'origin', 'main', 'https://example.test/project/docs.git');
  const error = await repo.init().catch(value => value);
  expect(error.message).toContain('fatal: authentication failed');
  expect(error.message).toContain('example.test/docs.git');
  expect(String(error.stack)).not.toContain('synthetic');
  expect(String(error.stack)).not.toContain('audit-user');
});

test.each(['exit', 'error', 'throw'])(
  'credentialed curl %s failures omit arguments and all output',
  async mode => {
    const credential = 'audit-user:synthetic token/@';
    const echoed = [
      credential,
      credential,
      encodeURIComponent(credential),
      'synthetic token/@'
    ].join(' ');
    vi.spyOn(cp, 'spawn').mockImplementation(() => {
      if (mode === 'throw') throw new Error(echoed);
      const child = Object.assign(new EventEmitter(), {
        stdout: new PassThrough(),
        stderr: new PassThrough()
      });
      queueMicrotask(() => {
        if (mode === 'error')
          child.emit('error', Object.assign(new Error(echoed), { spawnargs: [credential] }));
        else {
          child.stdout.write(echoed);
          child.stderr.write(echoed);
          child.emit('close', 7);
        }
      });
      return child as ReturnType<typeof cp.spawn>;
    });
    const repo = new Repo(credential, 'origin', 'main', 'https://example.test/project/docs.git');
    const error = await repo.curlPullRequest('https://example.test/pulls', '{"title":"test"}').then(
      () => {
        throw new Error('expected failure');
      },
      value => value
    );
    expect(error.message).toBe(
      "Credentialed 'curl' request failed. Check connectivity and provider credentials."
    );
    expect(String(error.stack)).not.toContain('synthetic');
    expect(Object.keys(error)).not.toContain('spawnargs');
    expect(repo.name).not.toContain('audit-user');
  }
);

test.each(['transport', 'malformed', 'provider'])(
  'PR %s failure logs and returns only sanitized errors',
  async mode => {
    const credential = 'audit-user:synthetic token/@';
    const echoed = [
      credential,
      encodeURIComponent(credential),
      'synthetic token/@',
      encodeURIComponent('synthetic token/@')
    ].join(' ');
    const logs = ['log', 'warn', 'error', 'debug', 'group', 'groupEnd'].map(method =>
      vi.spyOn(console, method as 'log').mockImplementation(() => {})
    );
    vi.spyOn(cp, 'spawn').mockImplementation(command => {
      const child = Object.assign(new EventEmitter(), {
        stdout: new PassThrough(),
        stderr: new PassThrough()
      });
      queueMicrotask(() => {
        if (command === 'curl') {
          if (mode === 'transport') child.stderr.write(echoed);
          else
            child.stdout.write(
              mode === 'malformed' ? echoed : JSON.stringify({ errors: [{ message: echoed }] })
            );
        }
        child.emit('close', command === 'curl' && mode === 'transport' ? 7 : 0);
      });
      return child as ReturnType<typeof cp.spawn>;
    });
    const repo = new Repo(credential, 'origin', 'main', 'https://example.test/project/docs.git');
    await repo.init();
    vi.spyOn(repo, 'removeWorktree').mockResolvedValue(undefined);
    const result = await repo.createPullRequest(
      { sid: 'editor', name: 'Editor', email: 'editor@example.test' },
      'edit',
      '/page.mdx',
      'https://example.test/pulls',
      '{}',
      'Update page'
    );
    expect(result).toHaveProperty('error');
    const exposed = JSON.stringify([result, ...logs.map(log => log.mock.calls)]);
    expect(exposed).not.toContain('synthetic');
    expect(exposed).not.toContain('audit-user');
  }
);
