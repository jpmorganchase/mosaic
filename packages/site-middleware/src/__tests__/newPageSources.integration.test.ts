import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { findNewPageOwner } from '../../../core/src/findNewPageOwner';
import { createNewPageHandler } from '../newPageHandler';
import { resolveContent } from '../resolveContent';

vi.mock('../cachedLoaders.js', () => ({
  getMdxRaw: async () => ({ kind: 'not-found' }),
  getSharedConfig: async (route: string) =>
    route === '/docs/index'
      ? { header: { title: 'Docs' }, sourceCapabilities: { writable: false } }
      : undefined
}));

let server: Server | undefined;
let root: string | undefined;
afterEach(async () => {
  if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
  server = undefined;
  if (root) await fs.rm(root, { recursive: true, force: true });
  root = undefined;
  vi.unstubAllEnvs();
});

describe.each(['active', 'snapshot-file'] as const)('new-page ownership in %s mode', mode => {
  test('uses source mounts without requiring an index at the mount, and refreshes removals', async () => {
    let sources = [
      { prefixDir: 'docs/sdk', writable: true },
      { prefixDir: 'docs/sdk/private', writable: false }
    ];
    const metadata = () => JSON.stringify({ version: 1, sources });
    let contentUrl = '';
    if (mode === 'active') {
      server = createServer((_req, res) => {
        res.end(metadata());
      });
      await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
      contentUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    } else {
      root = await fs.mkdtemp(path.join(os.tmpdir(), 'mosaic-owner-'));
      vi.stubEnv('MOSAIC_SNAPSHOT_DIR', path.relative(process.cwd(), root));
      await fs.writeFile(path.join(root, 'mosaic-new-page-sources.json'), metadata());
    }
    const handler = createNewPageHandler({ mode, contentUrl });
    const check = async (folder: string) =>
      (await handler(new Request(`http://site/api/content/new-page?folder=${folder}`))).json();
    for (const folder of [
      '/docs/sdk',
      '/docs/sdk/v2',
      '/docs/sdk/private/new',
      '/docs/sdk2',
      '/outside',
      '/'
    ]) {
      const owner = findNewPageOwner(
        sources.map(source => ({ ...source, hasWorkflow: () => true })),
        `${folder}/page.mdx`,
        'save'
      );
      expect(await check(folder)).toEqual({ folder, writable: owner?.writable ?? false });
    }
    expect(await resolveContent('/docs/sdk/v2/page', mode, contentUrl)).toMatchObject({
      kind: 'not-found',
      sharedConfig: { header: { title: 'Docs' }, sourceCapabilities: { writable: true } }
    });
    sources = [];
    if (root) await fs.writeFile(path.join(root, 'mosaic-new-page-sources.json'), metadata());
    expect(await check('/docs/sdk/v2')).toEqual({ folder: '/docs/sdk/v2', writable: false });
  });
});
