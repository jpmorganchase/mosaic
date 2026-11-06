/**
 * Snapshot-mode path handling in `cachedLoaders.ts`: route params arrive
 * percent-encoded, snapshot files use decoded names, and a decoded path
 * must never step outside the snapshot directory.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('next/cache', () => ({
  unstable_cache: (impl: (...args: unknown[]) => Promise<unknown>) => impl
}));

let root: string;
let snapshotRoot: string;

beforeAll(() => {
  // <root>/snapshot is the snapshot; <root>/outside is not.
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'mosaic-snapshot-paths-'));
  snapshotRoot = path.join(root, 'snapshot');
  fs.mkdirSync(path.join(snapshotRoot, 'docs site'), { recursive: true });
  fs.writeFileSync(path.join(snapshotRoot, 'docs site', 'café'), '---\ntitle: Café\n---\n# Café');
  fs.writeFileSync(
    path.join(snapshotRoot, 'docs site', 'shared-config.json'),
    JSON.stringify({ config: { header: { title: 'Docs site' } } })
  );
  fs.mkdirSync(path.join(root, 'outside'), { recursive: true });
  fs.writeFileSync(path.join(root, 'outside', 'secret'), '---\ntitle: Secret\n---\n# Secret');
  fs.writeFileSync(
    path.join(root, 'outside', 'shared-config.json'),
    JSON.stringify({ config: { header: { title: 'Outside' } } })
  );
});

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('MOSAIC_SNAPSHOT_DIR', path.relative(process.cwd(), snapshotRoot));
});

async function loadLoaders() {
  vi.doMock('react', async () => ({
    ...(await vi.importActual<typeof import('react')>('react')),
    cache: <T>(fn: T) => fn
  }));
  return import('../cachedLoaders.js');
}

describe('snapshot-file mode', () => {
  test('decodes percent-encoded routes to find the file', async () => {
    const { getMdxRaw } = await loadLoaders();

    const result = await getMdxRaw('/docs%20site/caf%C3%A9', 'snapshot-file', '');

    expect(result).toMatchObject({ kind: 'mdx', frontmatter: { title: 'Café' } });
  });

  test('decodes the folder used for the shared config', async () => {
    const { getSharedConfig } = await loadLoaders();

    const config = await getSharedConfig('/docs%20site/caf%C3%A9', 'snapshot-file', '');

    expect(config).toEqual({ header: { title: 'Docs site' } });
  });

  test('refuses encoded `..` segments that would leave the snapshot', async () => {
    // The file exists one level above the snapshot, so a plain decode
    // followed by `path.join` would read it.
    expect(fs.existsSync(path.join(root, 'outside', 'secret'))).toBe(true);
    const { getMdxRaw, getSharedConfig } = await loadLoaders();

    await expect(
      getMdxRaw('/docs/..%2F..%2Foutside%2Fsecret', 'snapshot-file', '')
    ).resolves.toEqual({ kind: 'not-found' });
    await expect(
      getSharedConfig('/..%2Foutside/page', 'snapshot-file', '')
    ).resolves.toBeUndefined();
  });

  test.each(['/docs/%E0%A4%A', '/docs/a%5Cb', '/docs/a%00b'])(
    'treats %s as not found',
    async pathname => {
      const { getMdxRaw } = await loadLoaders();

      await expect(getMdxRaw(pathname, 'snapshot-file', '')).resolves.toEqual({
        kind: 'not-found'
      });
    }
  );
});
