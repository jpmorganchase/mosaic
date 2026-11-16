import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
import { buildRouteInventory } from '../routeInventory.js';
import { loadLocalFile } from '../../../site-middleware/src/loaders/loadLocalFile.js';
import { getMdxRaw } from '../../../site-middleware/src/cachedLoaders.js';

let root: string;
let files: string[];
let aliases: string[];
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'mosaic-route-inventory-'));
  files = [];
  aliases = [];
  vi.stubEnv('MOSAIC_SNAPSHOT_DIR', root);
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await fs.rm(root, { recursive: true, force: true });
});
async function file(name: string, body = `---\nroute: /canonical-without-alias\n---\n${name}`) {
  files.push(name);
  await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true });
  await fs.writeFile(path.join(root, name), body);
}
async function alias(name: string, target: string, type: 'file' | 'dir' = 'file') {
  aliases.push(name);
  await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true });
  await fs.symlink(
    path.relative(path.dirname(path.join(root, name)), path.join(root, target)) || '.',
    path.join(root, name),
    type
  );
}
const inventory = async (options = {}) => {
  const routes = await buildRouteInventory({
    root,
    files,
    aliases,
    pageExtensions: ['.mdx', '.md', '.custom', '.json'],
    ...options
  });
  // Every fixture route must resolve through the actual public snapshot loader,
  // including its URL decoding and /index normalization, to the recorded file.
  for (const route of routes) {
    expect(await getMdxRaw(route.pathname, 'snapshot-file', '')).toMatchObject({
      kind: 'mdx',
      raw: await fs.readFile(path.join(root, route.sourcePathname), 'utf8')
    });
  }
  return routes;
};

describe('snapshot route inventory', () => {
  test('includes the implicit index route without inventing a directory shortcut', async () => {
    await file('/docs/index.mdx');
    expect(await inventory()).toEqual([
      { pathname: '/docs/index', sourcePathname: '/docs/index.mdx' },
      { pathname: '/docs/index.mdx', sourcePathname: '/docs/index.mdx' }
    ]);
  });

  test('records backing files, aliases, chains and only working directory shortcuts', async () => {
    await file('/docs/start/index.mdx');
    await file('/about.mdx');
    await alias('/docs/start/index', '/docs/start/index.mdx');
    await alias('/quickstart', '/docs/start/index.mdx');
    await alias('/elsewhere/start', '/quickstart');
    await alias('/about', '/about.mdx');
    const routes = await inventory();
    expect(routes).toContainEqual({
      pathname: '/docs/start',
      sourcePathname: '/docs/start/index.mdx'
    });
    expect(routes).toContainEqual({
      pathname: '/elsewhere/start',
      sourcePathname: '/docs/start/index.mdx'
    });
    expect(routes).toContainEqual({
      pathname: '/quickstart',
      sourcePathname: '/docs/start/index.mdx'
    });
    expect(routes).toContainEqual({ pathname: '/about', sourcePathname: '/about.mdx' });
    expect(
      routes.some(
        route => route.pathname === '/docs' || route.pathname === '/canonical-without-alias'
      )
    ).toBe(false);
    for (const route of routes) {
      const request = route.pathname.endsWith('/index') ? `${route.pathname}.mdx` : route.pathname;
      expect(await loadLocalFile(path.join(root, decodeURIComponent(request)))).toBe(
        await fs.readFile(path.join(root, route.sourcePathname), 'utf8')
      );
    }
  });

  test('keeps configured data/custom extensions without assuming they are MDX', async () => {
    await file('/docs/data.json');
    await file('/custom/index.custom');
    await alias('/custom/index', '/custom/index.custom');
    await alias('/custom-page', '/custom/index.custom');
    expect(await inventory()).toEqual([
      { pathname: '/custom', sourcePathname: '/custom/index.custom' },
      { pathname: '/custom-page', sourcePathname: '/custom/index.custom' },
      { pathname: '/custom/index.custom', sourcePathname: '/custom/index.custom' },
      { pathname: '/docs/data.json', sourcePathname: '/docs/data.json' }
    ]);
    expect(await inventory({ pageExtensions: ['.mdx'] })).toEqual([]);
  });

  test('excludes ignored, hidden and generated files even when JSON is admitted', async () => {
    for (const name of [
      '/docs/page.mdx',
      '/.hidden/page.mdx',
      '/docs/.hidden.mdx',
      '/docs/omit.mdx',
      '/shared-config.json',
      '/docs/sidebar.json',
      '/search-records.json',
      '/markdown-pages.json'
    ])
      await file(name);
    await alias('/hidden-alias', '/.hidden/page.mdx');
    expect(await inventory({ ignorePages: ['omit.mdx'] })).toEqual([
      { pathname: '/docs/page.mdx', sourcePathname: '/docs/page.mdx' }
    ]);
  });

  test('encodes URL names once while preserving decoded backing paths', async () => {
    await file('/docs space/café%20.mdx');
    await alias('/a percent% name', '/docs space/café%20.mdx');
    const routes = await inventory();
    expect(routes).toContainEqual({
      pathname: '/a%20percent%25%20name',
      sourcePathname: '/docs space/café%20.mdx'
    });
    for (const route of routes)
      expect(await loadLocalFile(path.join(root, decodeURIComponent(route.pathname)))).toContain(
        '/docs space/café%20.mdx'
      );
  });

  test('uses the file that the existing /index normalization actually reads', async () => {
    await file('/docs/index.mdx');
    await file('/other.mdx');
    await alias('/docs/index', '/other.mdx');
    const routes = await inventory();
    expect(routes).toContainEqual({ pathname: '/docs/index', sourcePathname: '/docs/index.mdx' });
    expect(routes).toContainEqual({ pathname: '/docs', sourcePathname: '/other.mdx' });
  });

  test.each(['dangling', 'cyclic'])('rejects a %s alias', async kind => {
    await alias('/broken', kind === 'dangling' ? '/missing.mdx' : '/loop');
    if (kind === 'cyclic') await alias('/loop', '/broken');
    await expect(inventory()).rejects.toThrow("Snapshot alias '/broken' is dangling or cyclic");
  });

  test('accepts an empty snapshot', async () => expect(await inventory()).toEqual([]));

  test('includes extensionless routes through distinct aliases to one directory', async () => {
    await file('/docs/page.mdx');
    await file('/docs/index.mdx');
    await alias('/docs/page', '/docs/page.mdx');
    await alias('/first', '/docs', 'dir');
    await alias('/second', '/docs', 'dir');
    const routes = await inventory();
    for (const prefix of ['/first', '/second']) {
      expect(routes).toContainEqual({
        pathname: `${prefix}/page`,
        sourcePathname: '/docs/page.mdx'
      });
      expect(routes).toContainEqual({
        pathname: `${prefix}/index`,
        sourcePathname: '/docs/index.mdx'
      });
    }
    for (const route of routes) {
      const request = route.pathname.endsWith('/index') ? `${route.pathname}.mdx` : route.pathname;
      expect(await loadLocalFile(path.join(root, decodeURIComponent(request)))).toBe(
        await fs.readFile(path.join(root, route.sourcePathname), 'utf8')
      );
    }
  });

  test('rejects a directory alias to an ancestor instead of enumerating forever', async () => {
    await file('/docs/page.mdx');
    await alias('/docs/loop', '/docs', 'dir');
    await expect(inventory()).rejects.toThrow('is cyclic');
  });
});
