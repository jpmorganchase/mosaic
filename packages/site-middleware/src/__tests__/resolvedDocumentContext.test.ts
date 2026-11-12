import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

// Exercise the real file/HTTP loaders outside a Next server render.
vi.mock('next/cache', () => ({
  unstable_cache: (impl: (...args: unknown[]) => Promise<unknown>) => impl
}));
vi.mock('react', async () => ({
  ...(await vi.importActual<typeof import('react')>('react')),
  cache: <T>(fn: T) => fn
}));

let snapshotRoot: string;
let contentUrl: string;
let server: http.Server;
const requests: string[] = [];
const sourceConfig = {
  header: { title: 'Docs source', homeLink: './index' },
  sourceCapabilities: { writable: true }
};

function write(relativePath: string, contents: string) {
  const filePath = path.join(snapshotRoot, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

beforeAll(async () => {
  // Snapshot config takes a relative path. Keep the fixture on the checkout
  // drive even when Windows puts the system temp directory on another drive.
  const tempRoot = path.resolve('.tmp');
  fs.mkdirSync(tempRoot, { recursive: true });
  snapshotRoot = fs.mkdtempSync(path.join(tempRoot, 'mosaic-document-context-'));
  // Real pipeline output: metadata describes the backing document, while
  // shared configuration lives only in a separate JSON file.
  write(
    'docs/start/index.mdx',
    '---\ntitle: Start\nroute: /docs/start/index\nfullPath: /docs/start/index.mdx\n---\n# Start'
  );
  write('docs/start/shared-config.json', JSON.stringify({ config: sourceConfig }));
  fs.symlinkSync('index.mdx', path.join(snapshotRoot, 'docs/start/index'));
  fs.symlinkSync('docs/start/index.mdx', path.join(snapshotRoot, 'quickstart'));
  // An alias can also live under another source's configuration.
  write(
    'other/shared-config.json',
    JSON.stringify({
      config: { header: { title: 'Other source' }, sourceCapabilities: { writable: false } }
    })
  );
  fs.symlinkSync('../docs/start/index.mdx', path.join(snapshotRoot, 'other/start'));
  write('broken/shared-config.json', '{ invalid json');
  fs.symlinkSync('../docs/start/index.mdx', path.join(snapshotRoot, 'broken/start'));
  write(
    'broken/page',
    '---\ntitle: Broken config\nfullPath: /broken/page.mdx\n---\n# Broken config'
  );
  write(
    'shared-config.json',
    JSON.stringify({
      config: { header: { title: 'Root source' }, sourceCapabilities: { writable: false } }
    })
  );
  write('about.mdx', '---\ntitle: About\nroute: /about\nfullPath: /about.mdx\n---\n# About');
  fs.symlinkSync('about.mdx', path.join(snapshotRoot, 'about'));
  // Public permalinks and source paths are intentionally independent.
  write(
    'docs/start/permalink.mdx',
    '---\ntitle: Published\nroute: /other/published\nfullPath: /docs/start/permalink.mdx\n---\n# Published'
  );
  fs.symlinkSync('docs/start/permalink.mdx', path.join(snapshotRoot, 'published'));
  write(
    'docs/start/no-route.mdx',
    '---\ntitle: Legacy\nfullPath: /docs/start/no-route.mdx\n---\n# Legacy'
  );
  fs.symlinkSync('docs/start/no-route.mdx', path.join(snapshotRoot, 'legacy'));

  server = http.createServer((request, response) => {
    const pathname = new URL(request.url!, 'http://content.test').pathname;
    requests.push(pathname);
    const rawRequest = pathname.startsWith('/_mosaic-raw/');
    const filePath = path.join(
      snapshotRoot,
      rawRequest ? pathname.slice('/_mosaic-raw'.length) : pathname
    );
    try {
      if (fs.statSync(filePath).isDirectory()) {
        response.writeHead(302, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ redirect: `${pathname}/index` }));
        return;
      }
      response.writeHead(200, {
        'Content-Type': pathname.endsWith('.json') ? 'application/json' : 'text/plain',
        ...(rawRequest && { 'X-Mosaic-Raw-Namespace': 'docs' })
      });
      response.end(fs.readFileSync(filePath));
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server address');
  contentUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(() => {
  requests.length = 0;
  vi.stubEnv('MOSAIC_SNAPSHOT_DIR', path.relative(process.cwd(), snapshotRoot));
});

afterEach(() => vi.unstubAllEnvs());
afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close(error => (error ? reject(error) : resolve()))
  );
  fs.rmSync(snapshotRoot, { recursive: true, force: true });
});

describe.each(['active', 'snapshot-file'] as const)('document context in %s mode', mode => {
  test.each(['/quickstart', '/other/start', '/broken/start', '/docs/start'])(
    'uses the target config for %s without embedded sharedConfig',
    async pathname => {
      const { resolveContent } = await import('../resolveContent.js');
      const result = await resolveContent(pathname, mode, contentUrl);

      expect(result).toMatchObject({
        kind: 'mdx',
        originalPathname: pathname,
        pathname: '/docs/start/index',
        sourcePathname: '/docs/start/index.mdx',
        sharedConfig: sourceConfig
      });
      if (result.kind !== 'mdx') throw new Error('Expected an MDX document');
      expect(result.mdx.frontmatter).not.toHaveProperty('sharedConfig');
    }
  );

  test('retains a root-level document and its own config', async () => {
    const { resolveContent } = await import('../resolveContent.js');
    expect(await resolveContent('/about', mode, contentUrl)).toMatchObject({
      kind: 'mdx',
      pathname: '/about',
      sourcePathname: '/about.mdx',
      sharedConfig: { header: { title: 'Root source' }, sourceCapabilities: { writable: false } }
    });
  });

  test('keeps a public permalink separate from source capabilities and provenance', async () => {
    const { resolveContent } = await import('../resolveContent.js');
    expect(await resolveContent('/published', mode, contentUrl)).toMatchObject({
      kind: 'mdx',
      pathname: '/other/published',
      sourcePathname: '/docs/start/permalink.mdx',
      sharedConfig: sourceConfig
    });
  });

  test('does not turn a missing public route into a filename URL', async () => {
    const { resolveContent } = await import('../resolveContent.js');
    expect(await resolveContent('/legacy', mode, contentUrl)).toMatchObject({
      kind: 'mdx',
      pathname: '/legacy',
      sourcePathname: '/docs/start/no-route.mdx',
      sharedConfig: sourceConfig
    });
  });

  test('still reports malformed configuration owned by the document', async () => {
    const { resolveContent } = await import('../resolveContent.js');
    await expect(resolveContent('/broken/page', mode, contentUrl)).rejects.toThrow();
  });
});

test('reads an alias editor source from the backing file endpoint', async () => {
  const { resolveContent } = await import('../resolveContent.js');
  const { getMdxRawSource } = await import('../cachedLoaders.js');
  const resolved = await resolveContent('/quickstart', 'active', contentUrl);
  if (resolved.kind !== 'mdx') throw new Error('Expected an MDX document');

  expect(await getMdxRawSource(resolved.sourcePathname, 'active', contentUrl)).toMatchObject({
    kind: 'raw',
    namespace: 'docs',
    bytes: expect.stringContaining('title: Start')
  });
  expect(requests).toContain('/_mosaic-raw/docs/start/index.mdx');
  expect(requests).not.toContain('/_mosaic-raw/quickstart.mdx');
});
