import { createServer, type Server } from 'node:http';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { populatedFixture, document } from '../../../plugins/src/__tests__/fixtures/llms.mjs';
import { createLlmsHandler } from '../llmsHandler';
import { createLlmsDiscoveryLoader, parseLlmsManifest } from '../llmsDiscovery';

const options = { scopes: [{ path: '/salt' }, { path: '/salt/components' }, { path: '/mosaic' }] };

describe.each(['active', 'snapshot-file'] as const)('generated scoped files in %s mode', mode => {
  let site: Awaited<ReturnType<typeof populatedFixture>>;
  let files: Record<string, string>;
  let root: string;
  let server: Server | undefined;
  let contentUrl: string;
  let handler: ReturnType<typeof createLlmsHandler>;
  let discovery: ReturnType<typeof createLlmsDiscoveryLoader>;
  let fail = false;
  const requests: string[] = [];

  const save = () => {
    // Deliberately leave old files on disk: the manifest must govern serving.
    for (const [route, content] of Object.entries(files)) {
      const target = join(root, route.slice(1));
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, content);
    }
  };
  const get = (path: string) =>
    handler(new Request(`http://site.test${path}`), {
      params: Promise.resolve({ path: path.slice(1).split('/') })
    });

  beforeEach(async () => {
    site = await populatedFixture(options);
    files = await site.publish(options);
    root = mkdtempSync(join(tmpdir(), 'mosaic-scoped-'));
    vi.stubEnv('MOSAIC_SNAPSHOT_DIR', relative(process.cwd(), root));
    contentUrl = '';
    fail = false;
    requests.length = 0;
    if (mode === 'active') {
      server = createServer((req, res) => {
        requests.push(req.url!);
        res.statusCode = fail ? 502 : files[req.url!] === undefined ? 404 : 200;
        res.end(fail ? 'Unavailable' : files[req.url!] ?? 'Missing');
      });
      await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
      contentUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    } else save();
    handler = createLlmsHandler({ mode, contentUrl, maxAge: 0 });
    discovery = createLlmsDiscoveryLoader(0);
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) =>
        server!.close(error => (error ? reject(error) : resolve()))
      );
      server = undefined;
    }
    rmSync(root, { recursive: true, force: true });
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  test('serves all six indexes, canonical Markdown, folder indexes and discovery', async () => {
    for (const path of [
      '/llms.txt',
      '/llms-full.txt',
      '/salt/llms.txt',
      '/salt/llms-full.txt',
      '/mosaic/llms.txt',
      '/mosaic/llms-full.txt',
      '/salt/components/llms.txt'
    ]) {
      const response = await get(path);
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
      expect(response.headers.get('Cache-Control')).toBe(
        mode === 'active'
          ? 'no-store'
          : 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400'
      );
      expect(await response.text()).toBe(files[path]);
    }
    const response = await get('/salt/components/button.md');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
    expect(response.headers.get('Vary')).toBe('Accept');
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
    expect(response.headers.get('Link')).toBe(
      '</salt/components/button.md>; rel="alternate"; type="text/markdown", </salt/components/llms.txt>; rel="describedby"'
    );
    expect(await response.text()).toBe(
      JSON.parse(files['/markdown-pages.json']).pages['/salt/components/button']
    );
    expect(await (await get('/salt.md')).text()).toBe(await (await get('/salt/index.md')).text());
    expect(await (await get('/Salt/LLMS.TXT')).text()).toBe(files['/salt/llms.txt']);
    expect(await discovery('/salt/components/button', mode, contentUrl)).toEqual({
      markdownUrl: '/salt/components/button.md',
      indexUrl: '/salt/components/llms.txt'
    });
    expect(await discovery('/salted/index', mode, contentUrl)).toEqual({
      markdownUrl: '/salted/index.md',
      indexUrl: '/llms.txt'
    });
    expect(await discovery('/not-generated', mode, contentUrl)).toBeUndefined();
  });

  test('a canonical root page does not invalidate the bundle or other pages discovery', async () => {
    const bundle = JSON.parse(files['/markdown-pages.json']);
    bundle.pages['/'] = '# Home';
    files['/markdown-pages.json'] = JSON.stringify(bundle);
    const manifest = JSON.parse(files['/llms-manifest.json']);
    manifest.routes.push('/');
    files['/llms-manifest.json'] = JSON.stringify(manifest);
    if (mode === 'snapshot-file') save();
    expect((await get('/salt/components/button.md')).status).toBe(200);
    expect(await discovery('/salt/components/button', mode, contentUrl)).toEqual({
      markdownUrl: '/salt/components/button.md',
      indexUrl: '/salt/components/llms.txt'
    });
    expect(() => parseLlmsManifest(JSON.stringify({ ...manifest, scopes: ['/'] }))).toThrow();
  });

  test('refreshes modified/deleted pages, scope removal and discovery without stale files', async () => {
    expect((await get('/salt/components/llms.txt')).status).toBe(200);
    expect((await get('/salt/components/button.md')).status).toBe(200);
    expect(await discovery('/salt/components/button', mode, contentUrl)).toBeDefined();
    await site.update('0', { '/salt/new.mdx': document('/salt/new', 'Updated public page') });
    files = await site.publish({ scopes: [{ path: '/salt' }] });
    if (mode === 'snapshot-file') save();
    expect((await get('/salt/components/llms.txt')).status).toBe(404);
    expect((await get('/salt/components/button.md')).status).toBe(404);
    expect(await discovery('/salt/components/button', mode, contentUrl)).toBeUndefined();
    expect(await (await get('/salt/llms-full.txt')).text()).toContain('Updated public page');
    expect(await discovery('/salt/components/advanced/index', mode, contentUrl)).toEqual({
      markdownUrl: '/salt/components/advanced/index.md',
      indexUrl: '/salt/llms.txt'
    });
  });

  test('unknown scopes, aliases and unsafe paths are 404 without reading arbitrary files', async () => {
    for (const route of [
      '/unknown/llms.txt',
      '/salted/llms.txt',
      '/salt/../llms.txt',
      '/salt/%2e%2e/llms.txt',
      '/salt%2fmosaic/llms.txt',
      '/salt\\mosaic/llms.txt',
      '/salt//llms.txt',
      '/salt/missing.md'
    ]) {
      expect((await get(route)).status).toBe(404);
    }
    expect(requests).not.toContain('/unknown/llms.txt');
    expect(requests).not.toContain('/salted/llms.txt');
  });

  test('missing configured files are 404 and malformed data returns 503', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    delete files['/salt/llms.txt'];
    if (mode === 'snapshot-file') rmSync(join(root, 'salt', 'llms.txt'));
    expect((await get('/salt/llms.txt')).status).toBe(404);
    files['/markdown-pages.json'] = '{"version":1,"pages":{"/salt/bad":42}}';
    if (mode === 'snapshot-file') save();
    expect((await get('/salt/bad.md')).status).toBe(503);
    files['/llms-manifest.json'] = '{"version":1,"scopes":["/../secret"],"routes":[]}';
    if (mode === 'snapshot-file') save();
    expect((await get('/salt/llms-full.txt')).status).toBe(503);
    expect(errors).toHaveBeenCalled();
  });

  test('expired active caches fail closed when the content server fails', async () => {
    if (mode !== 'active') return;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await get('/salt/llms-full.txt')).status).toBe(200);
    fail = true;
    const response = await get('/salt/llms-full.txt');
    expect(response.status).toBe(503);
    expect(await response.text()).toBe('Markdown is unavailable');
    expect(response.headers.get('Cache-Control')).toBeNull();
  });
});
