/**
 * Cross-request caching rules in `cachedLoaders.ts`:
 *
 *   - identified snapshots cache successful reads by root and generation,
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
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

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

beforeEach(() => {
  snapshotRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mosaic-cache-test-'));
  writeIdentity('11111111-1111-4111-8111-111111111111');
});

afterEach(() => {
  fs.rmSync(snapshotRoot, { recursive: true, force: true });
});

function writeIdentity(id: string, root = snapshotRoot) {
  fs.writeFileSync(path.join(root, 'mosaic-snapshot.json'), JSON.stringify({ version: 1, id }));
}

function writeContent(title: string, root = snapshotRoot) {
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'index.mdx'), `---\ntitle: ${title}\n---\n# ${title}`);
  fs.writeFileSync(
    path.join(root, 'docs', 'shared-config.json'),
    JSON.stringify({ config: { header: { title } } })
  );
}

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
  test('reuses a generation, then refreshes MDX and shared config when its identity changes', async () => {
    vi.stubEnv('MOSAIC_SNAPSHOT_DIR', path.relative(process.cwd(), snapshotRoot));
    writeContent('First');
    const { getMdxRaw, getSharedConfig } = await loadLoaders();
    const read = async (title: string) => {
      expect(await getMdxRaw('/docs/index', 'snapshot-file', '')).toMatchObject({
        kind: 'mdx',
        frontmatter: { title }
      });
      expect(await getSharedConfig('/docs/index', 'snapshot-file', '')).toEqual({
        header: { title }
      });
    };
    await read('First');
    writeContent('Second');
    // Published generations are immutable: unchanged identity reuses cached values.
    await read('First');
    expect(store.size).toBe(2);
    writeIdentity('22222222-2222-4222-8222-222222222222');
    await read('Second');
    expect(store.size).toBe(4);
  });

  test.each(['relative', 'absolute'])(
    'includes the resolved %s root even when two snapshots share an identity',
    async style => {
      const otherRoot = path.join(snapshotRoot, 'other');
      fs.mkdirSync(otherRoot);
      writeIdentity('11111111-1111-4111-8111-111111111111', otherRoot);
      writeContent('First');
      writeContent('Other', otherRoot);
      const { getMdxRaw, getSharedConfig } = await loadLoaders();
      for (const [root, title] of [
        [snapshotRoot, 'First'],
        [otherRoot, 'Other']
      ]) {
        vi.stubEnv(
          'MOSAIC_SNAPSHOT_DIR',
          style === 'absolute' ? root : path.relative(process.cwd(), root)
        );
        expect(await getMdxRaw('/docs/index', 'snapshot-file', '')).toMatchObject({
          kind: 'mdx',
          frontmatter: { title }
        });
        expect(await getSharedConfig('/docs/index', 'snapshot-file', '')).toEqual({
          header: { title }
        });
      }
      expect(store.size).toBe(4);
    }
  );

  test.each([
    undefined,
    'not json',
    JSON.stringify({ version: 2, id: '11111111-1111-4111-8111-111111111111' }),
    JSON.stringify({ version: 1, id: '' }),
    JSON.stringify({ version: 1, id: 'latest' })
  ])('bypasses persistent caching for a missing or invalid identity: %s', async envelope => {
    vi.stubEnv('MOSAIC_SNAPSHOT_DIR', path.relative(process.cwd(), snapshotRoot));
    writeContent('First');
    const { getMdxRaw, getSharedConfig } = await loadLoaders();
    await getMdxRaw('/docs/index', 'snapshot-file', '');
    await getSharedConfig('/docs/index', 'snapshot-file', '');
    expect(store.size).toBe(2);
    const file = path.join(snapshotRoot, 'mosaic-snapshot.json');
    if (envelope === undefined) fs.unlinkSync(file);
    else fs.writeFileSync(file, envelope);
    for (const title of ['Second', 'Third']) {
      writeContent(title);
      expect(await getMdxRaw('/docs/index', 'snapshot-file', '')).toMatchObject({
        kind: 'mdx',
        frontmatter: { title }
      });
      expect(await getSharedConfig('/docs/index', 'snapshot-file', '')).toEqual({
        header: { title }
      });
    }
    expect(store.size).toBe(2);
  });

  test('honors the cache-disable flag even for an identified snapshot', async () => {
    vi.stubEnv('MOSAIC_DISABLE_LOADER_CACHE', 'true');
    vi.stubEnv('MOSAIC_SNAPSHOT_DIR', path.relative(process.cwd(), snapshotRoot));
    const { getMdxRaw } = await loadLoaders();
    for (const title of ['First', 'Second']) {
      writeContent(title);
      expect(await getMdxRaw('/docs/index', 'snapshot-file', '')).toMatchObject({
        kind: 'mdx',
        frontmatter: { title }
      });
    }
    expect(store.size).toBe(0);
  });

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

  test('pages in the same folder share one shared-config entry', async () => {
    const snapshotDir = path.relative(process.cwd(), snapshotRoot);
    vi.stubEnv('MOSAIC_SNAPSHOT_DIR', snapshotDir);
    fs.mkdirSync(path.join(snapshotRoot, 'mosaic'), { recursive: true });
    fs.writeFileSync(
      path.join(snapshotRoot, 'mosaic', 'shared-config.json'),
      JSON.stringify({ config: { header: { title: 'Mosaic' } } })
    );
    const { getSharedConfig } = await loadLoaders();

    for (const pathname of ['/mosaic/index', '/mosaic/made-up-1', '/mosaic/made-up-2']) {
      expect(await getSharedConfig(pathname, 'snapshot-file', '')).toEqual({
        header: { title: 'Mosaic' }
      });
    }
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
