import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../snapshotIdentity.js', () => ({
  getSnapshotRoot: () => process.env.MOSAIC_SNAPSHOT_DIR
}));
import {
  generateMosaicStaticParams,
  loadSnapshotRoutes,
  mapMosaicStaticParams,
  parseSnapshotRoutes
} from '../routes.js';

let root: string;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'mosaic-routes-loader-'));
});
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
  vi.unstubAllEnvs();
});
const entries = [
  { pathname: '/docs', sourcePathname: '/docs/index.mdx' },
  { pathname: '/docs/index', sourcePathname: '/docs/index.mdx' },
  { pathname: '/about', sourcePathname: '/about.mdx' },
  { pathname: '/quickstart', sourcePathname: '/docs/start/index.mdx' },
  { pathname: '/data', sourcePathname: '/data.json' }
];
async function publish(routes = entries, destination = root, id = randomUUID()) {
  await fs.writeFile(
    path.join(destination, 'mosaic-routes.json'),
    JSON.stringify({ version: 1, snapshotId: id, routes })
  );
  await fs.writeFile(
    path.join(destination, 'mosaic-snapshot.json'),
    JSON.stringify({ version: 1, id })
  );
  return id;
}

describe('snapshot route contract', () => {
  test('loads a completed generation and selects supported documents independently of SEO', async () => {
    const id = await publish();
    await fs.writeFile(path.join(root, 'sitemap.xml'), '<urlset/>');
    expect(await loadSnapshotRoutes(root)).toEqual({ version: 1, snapshotId: id, routes: entries });
    const selected = await generateMosaicStaticParams({
      snapshotDir: root,
      pageExtensions: ['.mdx']
    });
    expect(selected).toEqual([
      { namespace: 'docs', route: [] },
      { namespace: 'docs', route: ['index'] },
      { namespace: 'about', route: [] },
      { namespace: 'quickstart', route: [] }
    ]);
    await fs.rm(path.join(root, 'sitemap.xml'));
    expect(
      await generateMosaicStaticParams({ snapshotDir: root, pageExtensions: ['.mdx'] })
    ).toEqual(selected);
  });

  test('accepts empty inventory but makes empty host selection explicit', async () => {
    await publish([]);
    expect((await loadSnapshotRoutes(root)).routes).toEqual([]);
    await expect(
      generateMosaicStaticParams({ snapshotDir: root, pageExtensions: ['.mdx'] })
    ).rejects.toThrow('selected no renderable routes');
    expect(
      await generateMosaicStaticParams({
        snapshotDir: root,
        pageExtensions: ['.mdx'],
        allowEmpty: true
      })
    ).toEqual([]);
    expect(
      mapMosaicStaticParams(entries, {
        pageExtensions: ['.mdx'],
        include: route => route.pathname === '/about'
      })
    ).toEqual([{ namespace: 'about', route: [] }]);
  });

  test('returns decoded Next params and leaves the root route to the host', () => {
    expect(
      mapMosaicStaticParams(
        [
          { pathname: '/', sourcePathname: '/index.mdx' },
          { pathname: '/docs%20space/caf%C3%A9%2520', sourcePathname: '/docs space/café%20.mdx' }
        ],
        { pageExtensions: ['.mdx'] }
      )
    ).toEqual([{ namespace: 'docs space', route: ['café%20'] }]);
  });

  test.each([
    { version: 2 },
    { snapshotId: 'invalid' },
    { routes: null },
    { extra: true },
    { routes: [{ pathname: '/docs/../outside', sourcePathname: '/docs/page.mdx' }] },
    { routes: [{ pathname: '/docs/%2Foutside', sourcePathname: '/docs/page.mdx' }] },
    { routes: [{ pathname: '/docs/%zz', sourcePathname: '/docs/page.mdx' }] },
    { routes: [{ pathname: '/docs/page?x=1', sourcePathname: '/docs/page.mdx' }] },
    { routes: [{ pathname: '//docs', sourcePathname: '/docs/page.mdx' }] },
    { routes: [{ pathname: '/docs', sourcePathname: '/docs/../outside' }] },
    { routes: [{ pathname: '/docs', sourcePathname: '/docs\\page.mdx' }] },
    { routes: [entries[0], entries[0]] }
  ])('rejects malformed envelope/paths: %j', patch => {
    expect(() =>
      parseSnapshotRoutes({ version: 1, snapshotId: randomUUID(), routes: entries, ...patch })
    ).toThrow('Regenerate the snapshot');
  });

  test('rejects incomplete, mismatched and legacy snapshots without treating them as empty', async () => {
    await expect(loadSnapshotRoutes(root)).rejects.toThrow('completion identity');
    const id = await publish();
    await fs.rm(path.join(root, 'mosaic-routes.json'));
    await expect(loadSnapshotRoutes(root)).rejects.toThrow('mosaic-routes.json');
    await publish(entries, root, id); // A failed read is not cached.
    expect((await loadSnapshotRoutes(root)).routes).toEqual(entries);
    await fs.writeFile(
      path.join(root, 'mosaic-snapshot.json'),
      JSON.stringify({ version: 1, id: randomUUID() })
    );
    await expect(loadSnapshotRoutes(root)).rejects.toThrow('Regenerate the snapshot');
  });

  test('keys parsed data by both resolved root and completion generation', async () => {
    const id = await publish();
    expect((await loadSnapshotRoutes(root)).routes).toEqual(entries);
    await publish([entries[2]]);
    expect((await loadSnapshotRoutes(root)).routes).toEqual([entries[2]]);
    const second = path.join(root, 'other');
    await fs.mkdir(second);
    await publish([entries[4]], second, id);
    expect((await loadSnapshotRoutes(second)).routes).toEqual([entries[4]]);
    vi.stubEnv('MOSAIC_SNAPSHOT_DIR', root);
    expect((await loadSnapshotRoutes()).routes).toEqual([entries[2]]);
  });

  test('does not retain malformed JSON as a successful cache entry', async () => {
    const id = await publish();
    await fs.writeFile(path.join(root, 'mosaic-routes.json'), '{');
    await expect(loadSnapshotRoutes(root)).rejects.toThrow('Regenerate the snapshot');
    await publish(entries, root, id);
    expect((await loadSnapshotRoutes(root)).routes).toEqual(entries);
  });
});
