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
  const redirects = new Map<string, string>();

  const save = () => {
    // Deliberately leave old files on disk: the manifest must govern serving.
    for (const [route, content] of Object.entries(files)) {
      const target = join(root, route.slice(1));
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, content);
    }
  };
  const get = (path: string, headers?: HeadersInit) =>
    handler(new Request(`http://site.test${path}`, { headers }), {
      params: Promise.resolve({ path: path.slice(1).split('/').map(decodeURIComponent) })
    });

  beforeEach(async () => {
    site = await populatedFixture(options);
    files = await site.publish(options);
    root = mkdtempSync(join(tmpdir(), 'mosaic-scoped-'));
    vi.stubEnv('MOSAIC_SNAPSHOT_DIR', relative(process.cwd(), root));
    contentUrl = '';
    fail = false;
    requests.length = 0;
    redirects.clear();
    if (mode === 'active') {
      server = createServer((req, res) => {
        requests.push(req.url!);
        const redirect = redirects.get(req.url!);
        if (redirect) {
          res.statusCode = 302;
          res.end(JSON.stringify({ redirect }));
          return;
        }
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
      '</salt/components/button>; rel="canonical", </salt/components/button.md>; rel="alternate"; type="text/markdown", </salt/components/llms.txt>; rel="describedby"'
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

  test.each([1, 2])(
    'serves an HTML alias with the canonical v%s Markdown and scope',
    async version => {
      const alias = '/mosaic/button-alias';
      const canonical = '/salt/components/button';
      files[alias] = document(canonical, 'Alias source bytes');
      const bundle = JSON.parse(files['/markdown-pages.json']);
      const manifest = JSON.parse(files['/llms-manifest.json']);
      files['/markdown-pages.json'] = JSON.stringify({ ...bundle, version });
      files['/llms-manifest.json'] = JSON.stringify({ ...manifest, version });
      if (mode === 'snapshot-file') save();

      const direct = await get(`${canonical}.md`);
      const expected = await direct.text();
      for (const response of [
        await get(alias, { Accept: 'text/markdown' }),
        await get(`${alias}.md`)
      ]) {
        expect(response.status).toBe(200);
        expect(await response.text()).toBe(expected);
        expect(response.headers.get('Link')).toBe(direct.headers.get('Link'));
        expect(response.headers.get('Link')).toContain(
          '</salt/components/llms.txt>; rel="describedby"'
        );
      }
      expect(manifest.routes).not.toContain(alias);
      expect(files['/llms.txt']).not.toContain(alias);
    }
  );

  test.each(['/mosaic/shortcut', '/mosaic/shortcut(docs)'])(
    'resolves the folder alias %s through its HTML index',
    async folder => {
      const canonical = '/salt/components/button';
      const source = document(canonical, 'Folder index source bytes');
      if (mode === 'active') {
        redirects.set(folder, `${folder}/index`);
        redirects.set('/mosaic/redirect', canonical);
        files[`${folder}/index.mdx`] = source;
      } else {
        files[`${folder}/index`] = source;
        save();
      }

      const response = await get(`${folder}.md`);
      expect(response.status).toBe(200);
      expect(response.headers.get('Link')).toContain(`<${canonical}>; rel="canonical"`);
      expect(await response.text()).toBe(await (await get(`${canonical}.md`)).text());
      if (mode === 'active') expect((await get('/mosaic/redirect.md')).status).toBe(404);
    }
  );

  test('keeps an alias to an excluded page unavailable', async () => {
    const backing = '/salt/components/hidden';
    const source = document(backing, 'Excluded content', { llms: { exclude: true } });
    await site.update('hidden', { [`${backing}.mdx`]: source }, options);
    files = await site.publish(options);
    files['/mosaic/hidden-alias'] = source;
    if (mode === 'snapshot-file') save();

    expect((await get('/mosaic/hidden-alias.md')).status).toBe(404);
    expect(files['/llms-full.txt']).not.toContain('Excluded content');
  });

  test('root discovery resolves its canonical Markdown without selecting /index', async () => {
    const bundle = JSON.parse(files['/markdown-pages.json']);
    bundle.pages['/'] = '# Home';
    bundle.pages['/index'] = '# A distinct index page';
    files['/markdown-pages.json'] = JSON.stringify(bundle);
    const manifest = JSON.parse(files['/llms-manifest.json']);
    manifest.routes.push('/', '/index');
    files['/llms-manifest.json'] = JSON.stringify(manifest);
    if (mode === 'snapshot-file') save();
    const home = await discovery('/', mode, contentUrl);
    expect(home).toEqual({ markdownUrl: '/.md', indexUrl: '/llms.txt' });
    const response = await get(home!.markdownUrl);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('# Home');
    expect(response.headers.get('Link')).toBe(
      '</>; rel="canonical", </.md>; rel="alternate"; type="text/markdown", </llms.txt>; rel="describedby"'
    );
    expect(await (await get('/index.md')).text()).toBe('# A distinct index page');
    expect((await get('/salt/components/button.md')).status).toBe(200);
    expect(await discovery('/salt/components/button', mode, contentUrl)).toEqual({
      markdownUrl: '/salt/components/button.md',
      indexUrl: '/salt/components/llms.txt'
    });
    expect(() => parseLlmsManifest(JSON.stringify({ ...manifest, scopes: ['/'] }))).toThrow();
  });

  test('ignores an invalid siteUrl instead of making every page unavailable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const manifest = JSON.parse(files['/llms-manifest.json']);
    const publish = (siteUrl: unknown) => {
      files['/llms-manifest.json'] = JSON.stringify({ ...manifest, siteUrl });
      if (mode === 'snapshot-file') save();
    };
    publish('https://docs.example.com');
    expect((await get('/salt/components/button.md')).headers.get('Link')).toBe(
      '<https://docs.example.com/salt/components/button>; rel="canonical", <https://docs.example.com/salt/components/button.md>; rel="alternate"; type="text/markdown", <https://docs.example.com/salt/components/llms.txt>; rel="describedby"'
    );

    // Written by an older plugin that didn't normalize the option.
    publish(`HTTPS://${mode}.example.com `);
    for (let request = 0; request < 2; request++) {
      const response = await get('/salt/components/button.md');
      expect(response.status).toBe(200);
      expect(response.headers.get('Link')).toBe(
        '</salt/components/button>; rel="canonical", </salt/components/button.md>; rel="alternate"; type="text/markdown", </salt/components/llms.txt>; rel="describedby"'
      );
    }
    expect((await get('/salt/llms.txt')).status).toBe(200);
    expect(await discovery('/salt/components/button', mode, contentUrl)).toEqual({
      markdownUrl: '/salt/components/button.md',
      indexUrl: '/salt/components/llms.txt'
    });
    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(`Ignoring invalid siteUrl "HTTPS://${mode}.example.com "`)
    );

    for (const siteUrl of ['javascript:alert(1)', 'https://x.test/"><script>', 42, null]) {
      expect(parseLlmsManifest(JSON.stringify({ ...manifest, siteUrl }))).not.toHaveProperty(
        'siteUrl'
      );
    }
    expect(() =>
      parseLlmsManifest(JSON.stringify({ ...manifest, siteUrl: 42, routes: [42] }))
    ).toThrow();
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

  test('normalizes authored trailing slashes without invalidating unrelated pages or indexes', async () => {
    await site.update('trailing', {
      '/salt/guide.mdx': document('/salt/guide/', 'Trailing guide', { fullPath: '/salt/guide.mdx' })
    });
    files = await site.publish(options);
    files['/mosaic/trailing-alias'] = document('/salt/guide/', 'Trailing alias metadata', {
      fullPath: '/salt/guide.mdx'
    });
    if (mode === 'snapshot-file') save();
    expect((await get('/mosaic/setup.md')).status).toBe(200);
    expect((await get('/salt/llms.txt')).status).toBe(200);
    expect(await (await get('/salt/guide.md')).text()).toContain('Trailing guide');
    expect(await (await get('/mosaic/trailing-alias.md')).text()).toContain('Trailing guide');
    expect(await discovery('/salt/guide/', mode, contentUrl)).toEqual({
      markdownUrl: '/salt/guide.md',
      indexUrl: '/salt/llms.txt'
    });
    expect(files['/salt/llms.txt']).toContain('/salt/guide.md');
    expect(JSON.parse(files['/markdown-pages.json']).pages).not.toHaveProperty('/salt/guide/');
  });

  test('serves percent filenames and authored escapes as distinct Markdown pages', async () => {
    await site.update('percent', {
      '/salt/release%20notes.mdx': document('/salt/release%20notes', 'Literal percent'),
      '/salt/backing.mdx': document('/salt/release%20notes', 'Authored permalink', {
        fullPath: '/salt/backing.mdx'
      }),
      '/salt/team.mdx': document('/salt/%c3%89quipe', 'Escaped uppercase', {
        fullPath: '/salt/team.mdx'
      }),
      '/salt/working notes.mdx': document('/salt/working notes', 'Literal space')
    });
    files = await site.publish(options);
    const aliasFile = mode === 'active' ? '/mosaic/literal%2520alias' : '/mosaic/literal%20alias';
    files[aliasFile] = document('/salt/release%20notes', 'Literal percent alias metadata');
    if (mode === 'snapshot-file') save();

    for (const [route, pathname, title] of [
      ['/salt/release%20notes', '/salt/release%2520notes', 'Literal percent'],
      ['/salt/release%20notes', '/salt/release%20notes', 'Authored permalink'],
      ['/salt/%c3%89quipe', '/salt/%C3%A9quipe', 'Escaped uppercase'],
      ['/salt/working notes', '/salt/working%20notes', 'Literal space']
    ]) {
      const markdownUrl = `${pathname}.md`;
      expect(files['/salt/llms.txt']).toContain(`[${title}](${markdownUrl})`);
      expect(await discovery(route, mode, contentUrl, pathname)).toEqual({
        markdownUrl,
        indexUrl: '/salt/llms.txt'
      });
      const response = await get(markdownUrl);
      expect(response.status).toBe(200);
      expect(response.headers.get('Link')).toContain(`<${pathname}>; rel="canonical"`);
      expect(await response.text()).toContain(`url: "${pathname}"`);
    }
    expect((await get('/salt/%C3%89quipe.md')).headers.get('Link')).toContain(
      '</salt/%C3%A9quipe>; rel="canonical"'
    );
    const alias = await get('/mosaic/literal%2520alias.md');
    expect(alias.status).toBe(200);
    expect(await alias.text()).toContain('Literal percent');
    expect(alias.headers.get('Link')).toContain('</salt/release%2520notes>; rel="canonical"');
  });

  test.each([
    [1, 2],
    [2, 1]
  ])('serves a v%s bundle while its manifest is v%s', async (bundleVersion, manifestVersion) => {
    const key = (version: number) => (version === 1 ? '/salt/guide notes' : '/salt/guide%20notes');
    const bundle = JSON.parse(files['/markdown-pages.json']);
    bundle.version = bundleVersion;
    bundle.pages[key(bundleVersion)] = '# Guide notes';
    files['/markdown-pages.json'] = JSON.stringify(bundle);
    const manifest = JSON.parse(files['/llms-manifest.json']);
    manifest.version = manifestVersion;
    manifest.routes.push(key(manifestVersion));
    files['/llms-manifest.json'] = JSON.stringify(manifest);
    if (mode === 'snapshot-file') save();

    const response = await get('/salt/guide%20notes.md');
    expect(response.status).toBe(200);
    expect(response.headers.get('Link')).toContain('</salt/guide%20notes>; rel="canonical"');
    expect(await response.text()).toBe('# Guide notes');
  });

  test('reads legacy trailing-slash bundles and omits ambiguous normalized routes', async () => {
    const bundle = JSON.parse(files['/markdown-pages.json']);
    bundle.version = 1;
    bundle.pages['/salt/guide/'] = '# Legacy guide';
    bundle.pages['/salt/clash'] = '# First';
    bundle.pages['/salt/clash/'] = '# Second';
    bundle.pages['/salt/clash/index'] = '# Distinct index';
    files['/markdown-pages.json'] = JSON.stringify(bundle);
    const manifest = JSON.parse(files['/llms-manifest.json']);
    manifest.version = 1;
    manifest.routes.push('/salt/guide/', '/salt/clash', '/salt/clash/', '/salt/clash/index');
    files['/llms-manifest.json'] = JSON.stringify(manifest);
    files['/salt/clash'] = document('/salt/components/button', 'Unrelated alias');
    if (mode === 'snapshot-file') save();
    expect((await get('/mosaic/setup.md')).status).toBe(200);
    expect((await get('/salt/llms.txt')).status).toBe(200);
    expect(await (await get('/salt/guide.md')).text()).toBe('# Legacy guide');
    expect(await (await get('/salt/guide/.md')).text()).toBe('# Legacy guide');
    expect(await discovery('/salt/guide/', mode, contentUrl)).toEqual({
      markdownUrl: '/salt/guide.md',
      indexUrl: '/salt/llms.txt'
    });
    expect((await get('/salt/clash.md')).status).toBe(404);
    expect(await (await get('/salt/clash/index.md')).text()).toBe('# Distinct index');
    expect(await discovery('/salt/clash', mode, contentUrl)).toBeUndefined();
  });

  test('unknown scopes and unsafe paths are 404 without reading arbitrary files', async () => {
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
