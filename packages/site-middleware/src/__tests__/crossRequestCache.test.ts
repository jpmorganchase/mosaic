/**
 * Cross-request caching rules in `cachedLoaders.ts`:
 *
 *   - snapshot modes cache successful reads,
 *   - negative results (404s, missing files) are never stored,
 *   - active mode bypasses the cache unless `MOSAIC_ACTIVE_MODE_CACHE`
 *     is set.
 *
 * `unstable_cache` is replaced by a tiny in-memory memoiser with the
 * same contract (keyed by arguments; a rejection is not stored), which
 * is all these rules rely on.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

const store = new Map<string, unknown>();
vi.mock('next/cache', () => ({
  unstable_cache:
    (impl: (...args: unknown[]) => Promise<unknown>, keyParts: string[]) =>
    async (...args: unknown[]) => {
      const key = JSON.stringify([keyParts, args]);
      if (store.has(key)) return store.get(key);
      const value = await impl(...args);
      store.set(key, value);
      return value;
    }
}));

let snapshotRoot: string;

beforeAll(() => {
  snapshotRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mosaic-cache-test-'));
});

afterAll(() => {
  fs.rmSync(snapshotRoot, { recursive: true, force: true });
});

beforeEach(() => {
  store.clear();
  vi.resetModules();
  vi.stubEnv('MOSAIC_DISABLE_LOADER_CACHE', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function loadLoaders() {
  // `React.cache` is request-scoped in Next; outside it, make it a no-op
  // so every call reaches the cross-request layer under test.
  vi.doMock('react', async () => ({
    ...(await vi.importActual<typeof import('react')>('react')),
    cache: <T>(fn: T) => fn
  }));
  return import('../cachedLoaders.js');
}

describe('snapshot-file mode', () => {
  test('a 404 is not stored, so the page is found once it exists', async () => {
    const snapshotDir = path.relative(process.cwd(), snapshotRoot);
    vi.stubEnv('MOSAIC_SNAPSHOT_DIR', snapshotDir);
    const { getMdxRaw } = await loadLoaders();

    const first = await getMdxRaw('/mosaic/new-page', 'snapshot-file', '');
    expect(first).toEqual({ kind: 'not-found' });
    expect(store.size).toBe(0);

    fs.mkdirSync(path.join(snapshotRoot, 'mosaic'), { recursive: true });
    fs.writeFileSync(path.join(snapshotRoot, 'mosaic', 'new-page'), '---\ntitle: New\n---\n# New');

    const second = await getMdxRaw('/mosaic/new-page', 'snapshot-file', '');
    expect(second).toMatchObject({ kind: 'mdx', frontmatter: { title: 'New' } });
    expect(store.size).toBe(1);
  });
});

describe('active mode', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => new Response('# Hi', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  test('bypasses the cross-request cache by default', async () => {
    const { getMdxRaw } = await loadLoaders();
    await getMdxRaw('/mosaic/index', 'active', 'http://content.test');
    await getMdxRaw('/mosaic/index', 'active', 'http://content.test');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(store.size).toBe(0);
  });

  test('caches successful reads with MOSAIC_ACTIVE_MODE_CACHE=true', async () => {
    vi.stubEnv('MOSAIC_ACTIVE_MODE_CACHE', 'true');
    const { getMdxRaw } = await loadLoaders();
    await getMdxRaw('/mosaic/index', 'active', 'http://content.test');
    await getMdxRaw('/mosaic/index', 'active', 'http://content.test');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('never stores a cold-start 404, even with caching enabled', async () => {
    vi.stubEnv('MOSAIC_ACTIVE_MODE_CACHE', 'true');
    fetchMock.mockImplementationOnce(async () => new Response('', { status: 404 }));
    const { getMdxRaw } = await loadLoaders();

    expect(await getMdxRaw('/mosaic/index', 'active', 'http://content.test')).toEqual({
      kind: 'not-found'
    });
    expect(await getMdxRaw('/mosaic/index', 'active', 'http://content.test')).toMatchObject({
      kind: 'mdx'
    });
  });
});
