import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { WorkerData } from '@jpmorganchase/mosaic-types';
import { expect, test } from 'vitest';
import { getSourceCacheKey, loadSourceCache, writeSourceCache } from '../sourceCache.js';

test('a completed cache write replaces the previous generation and malformed caches are ignored', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mosaic-worker-cache-'));
  const cachePath = path.join(root, 'source.json');
  const generation = (body: string) => ({ pages: { '/page.mdx': body }, data: {}, symlinks: {} });
  try {
    await writeFile(cachePath, '{"partial":');
    await expect(loadSourceCache(cachePath)).resolves.toBeUndefined();

    for (const body of ['old', 'new']) {
      await writeSourceCache(cachePath, Buffer.from(JSON.stringify(generation(body))));
    }
    const restored = await loadSourceCache(cachePath);
    expect(JSON.parse(new TextDecoder().decode(restored))).toEqual(generation('new'));
    expect(await readdir(root)).toEqual(['source.json']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('cache identities include the namespace and plugin options', () => {
  const worker = {
    namespace: 'first',
    plugins: [{ modulePath: 'fixture', options: { increment: 1 } }]
  } as WorkerData;
  expect(getSourceCacheKey({ ...worker, namespace: 'second' })).not.toBe(getSourceCacheKey(worker));
  expect(
    getSourceCacheKey({
      ...worker,
      plugins: [{ modulePath: 'fixture', options: { increment: 2 } }]
    })
  ).not.toBe(getSourceCacheKey(worker));
});
