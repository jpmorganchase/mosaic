/**
 * `getSidebarData` reads the `sidebar.json` that `SidebarPlugin`
 * publishes for each sidebar root folder.
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

const tree = [
  { id: '/docs/guides/index', name: 'Guides', data: { level: 1, link: '/docs/guides/index' } }
];
let snapshotRoot: string;

beforeAll(() => {
  snapshotRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mosaic-sidebar-test-'));
  fs.mkdirSync(path.join(snapshotRoot, 'docs', 'guides'), { recursive: true });
  fs.writeFileSync(
    path.join(snapshotRoot, 'docs', 'guides', 'sidebar.json'),
    JSON.stringify({ pages: tree })
  );
});

afterAll(() => {
  fs.rmSync(snapshotRoot, { recursive: true, force: true });
});

beforeEach(() => {
  store.clear();
  vi.resetModules();
  vi.stubEnv('MOSAIC_DISABLE_LOADER_CACHE', '');
  vi.stubEnv('MOSAIC_SNAPSHOT_DIR', path.relative(process.cwd(), snapshotRoot));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function loadLoaders() {
  vi.doMock('react', async () => ({
    ...(await vi.importActual<typeof import('react')>('react')),
    cache: <T>(fn: T) => fn
  }));
  return import('../cachedLoaders.js');
}

describe('snapshot-file mode', () => {
  test('returns the pages of a folder’s sidebar.json', async () => {
    const { getSidebarData } = await loadLoaders();

    await expect(getSidebarData('/docs/guides', 'snapshot-file', '')).resolves.toEqual(tree);
    await expect(getSidebarData('/docs/guides/', 'snapshot-file', '')).resolves.toEqual(tree);
  });

  test('returns undefined, without caching, for a folder that is not a sidebar root', async () => {
    const { getSidebarData } = await loadLoaders();

    await expect(getSidebarData('/docs', 'snapshot-file', '')).resolves.toBeUndefined();
    expect(store.size).toBe(0);
  });

  test('refuses folders that would leave the snapshot', async () => {
    const { getSidebarData } = await loadLoaders();

    await expect(getSidebarData('/docs/..%2F..', 'snapshot-file', '')).resolves.toBeUndefined();
  });
});

describe('active mode', () => {
  test('fetches the folder’s sidebar.json from the content server', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ pages: tree })));
    vi.stubGlobal('fetch', fetchMock);
    const { getSidebarData } = await loadLoaders();

    await expect(getSidebarData('/docs/guides', 'active', 'http://content')).resolves.toEqual(tree);
    expect(fetchMock).toHaveBeenCalledWith('http://content/docs/guides/sidebar.json', {
      cache: 'no-store'
    });
  });

  test('returns undefined for a 404 and throws for other failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response('', { status: 404 }))
        .mockResolvedValueOnce(new Response('', { status: 500, statusText: 'Boom' }))
    );
    const { getSidebarData } = await loadLoaders();

    await expect(getSidebarData('/docs', 'active', 'http://content')).resolves.toBeUndefined();
    await expect(getSidebarData('/docs', 'active', 'http://content')).rejects.toThrow('500 Boom');
  });
});
