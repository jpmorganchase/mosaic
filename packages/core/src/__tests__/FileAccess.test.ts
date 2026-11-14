import { describe, expect, test, vi } from 'vitest';
import { Volume } from 'memfs';

import FileAccess from '../filesystems/FileAccess.js';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe('FileAccess cached reads', () => {
  test('deduplicates failing hooks, rejects every reader and retries successfully', async () => {
    const volume = Volume.fromJSON({ '/page.mdx': 'body' });
    const files = new FileAccess(volume);
    const pending = deferred<Buffer>();
    const hook = vi
      .fn()
      .mockImplementationOnce(() => pending.promise)
      .mockImplementation(async (_, data) => data);
    files.$$addReadFileHook(hook);
    files.$$freeze();
    const results = Promise.allSettled([files.readFile('/page.mdx'), files.readFile('/page.mdx')]);
    await vi.waitFor(() => expect(hook).toHaveBeenCalledTimes(1));
    const failure = new Error('hook failed');
    pending.reject(failure);
    expect(await results).toEqual([
      { status: 'rejected', reason: failure },
      { status: 'rejected', reason: failure }
    ]);
    expect(String(await files.readFile('/page.mdx'))).toBe('body');
    expect(String(await files.readFile('/page.mdx'))).toBe('body');
    expect(hook).toHaveBeenCalledTimes(2);
  });

  test.each(['success', 'failure'] as const)(
    'an old %s after invalidation cannot replace or evict the current read',
    async outcome => {
      const files = new FileAccess(Volume.fromJSON({ '/page.mdx': 'body' }));
      const old = deferred<Buffer>();
      const current = deferred<Buffer>();
      const hook = vi
        .fn()
        .mockImplementationOnce(() => old.promise)
        .mockImplementation(() => current.promise);
      files.$$addReadFileHook(hook);
      files.$$freeze();
      const oldResult = files.readFile('/page.mdx').catch(error => error);
      await vi.waitFor(() => expect(hook).toHaveBeenCalledTimes(1));
      files.$$clearCache();
      const currentResult = files.readFile('/page.mdx');
      await vi.waitFor(() => expect(hook).toHaveBeenCalledTimes(2));
      if (outcome === 'failure') old.reject(new Error('old failure'));
      else old.resolve(Buffer.from('old result'));
      await oldResult;
      const anotherReader = files.readFile('/page.mdx');
      current.resolve(Buffer.from('current result'));
      expect(String(await currentResult)).toBe('current result');
      expect(String(await anotherReader)).toBe('current result');
      expect(String(await files.readFile('/page.mdx'))).toBe('current result');
      expect(hook).toHaveBeenCalledTimes(2);
    }
  );

  test.each(['write', 'reset'] as const)('an old read cannot overwrite a %s', async action => {
    const files = new FileAccess(Volume.fromJSON({ '/page.mdx': 'old' }));
    const old = deferred<Buffer>();
    const hook = vi
      .fn()
      .mockImplementationOnce(() => old.promise)
      .mockImplementation(async (_, data) => data);
    files.$$addReadFileHook(hook);
    const oldResult = files.readFile('/page.mdx');
    await vi.waitFor(() => expect(hook).toHaveBeenCalledTimes(1));
    if (action === 'write') await files.writeFile('/page.mdx', 'new');
    else {
      await files.$$reset();
      files.fromJSON({ '/page.mdx': 'new' });
    }
    files.$$freeze();
    expect(String(await files.readFile('/page.mdx'))).toBe('new');
    old.resolve(Buffer.from('stale'));
    await oldResult;
    expect(String(await files.readFile('/page.mdx'))).toBe('new');
  });
});

describe('GIVEN FileAccess.$$symlinksFromJSON', () => {
  test('THEN every symlink exists by the time the returned promise resolves', async () => {
    const volume = new Volume();
    volume.fromJSON({ '/docs/page.mdx': 'content', '/docs/other.mdx': 'other' });
    const fileAccess = new FileAccess(volume);

    await fileAccess.$$symlinksFromJSON({
      '/aliases/nested/page.mdx': [{ target: '/docs/page.mdx', type: 'file' }],
      '/aliases/other.mdx': [{ target: '/docs/other.mdx', type: 'file' }]
    });

    expect(volume.readlinkSync('/aliases/nested/page.mdx')).toBe('/docs/page.mdx');
    expect(volume.readlinkSync('/aliases/other.mdx')).toBe('/docs/other.mdx');
  });

  test('THEN a failure rejects the returned promise instead of becoming an unhandled rejection', async () => {
    const volume = new Volume();
    volume.fromJSON({ '/docs/page.mdx': 'content' });
    const fileAccess = new FileAccess(volume);

    await expect(
      fileAccess.$$symlinksFromJSON({
        // The alias's parent is a file, so the symlink can't be created.
        '/docs/page.mdx/alias.mdx': [{ target: '/docs/page.mdx', type: 'file' }]
      })
    ).rejects.toThrow();
  });
});
