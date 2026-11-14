import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const loaders = vi.hoisted(() => ({
  getMdxRaw: vi.fn(),
  getSharedConfig: vi.fn(),
  getMdxRawSource: vi.fn(),
  loadSitemap: vi.fn(),
  resolveMosaicMode: vi.fn()
}));
const editor = vi.hoisted(() => ({ enabled: false }));
const connection = vi.hoisted(() => vi.fn(async () => {}));

vi.mock('../../../../../../site-middleware/src/cachedLoaders.js', () => loaders);
vi.mock('@jpmorganchase/mosaic-site-middleware', async () => ({
  ...loaders,
  ...(await vi.importActual('../../../../../../site-middleware/src/resolveContent.js')),
  serializeMdxForClient: async () => ({ compiledSource: '', frontmatter: {} })
}));
vi.mock('next/server', () => ({ connection }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not-found');
  },
  redirect: (destination: string) => {
    throw new Error(`redirect: ${destination}`);
  }
}));
vi.mock('../../../../auth', () => ({
  get AUTH_ENABLED() {
    return editor.enabled;
  },
  auth: async () => (editor.enabled ? { user: { name: 'Editor' } } : null),
  isAuthorizedEditor: () => editor.enabled
}));
vi.mock('../../../providers', () => ({
  StoreShell: ({ children }: { children: ReactNode }) => children
}));
vi.mock('../../NamespaceFrame', () => ({
  FrameSync: ({
    route,
    sharedConfig
  }: {
    route: string;
    sharedConfig?: { header?: { title?: string } };
  }) => <span data-frame-route={route} data-frame-title={sharedConfig?.header?.title} />
}));
vi.mock('../BodyServer', () => ({
  BodyServer: ({ raw }: { raw: string }) => <article>{raw}</article>
}));
vi.mock('../EditorBodyLazy', () => ({
  EditorBodyLazy: ({ route }: { route: string }) => <span data-editor-route={route} />
}));
vi.mock('../RouteMetadata', () => ({ RouteMetadata: () => null }));
vi.mock('../CanonicalizeUrl', () => ({
  CanonicalizeUrl: ({ canonical }: { canonical: string }) => <span data-canonical-url={canonical} />
}));

const document = (title: string, route: string) => ({
  kind: 'mdx',
  raw: title,
  frontmatter: { title, route }
});
const request = (namespace: string, route?: string[]) => ({
  params: Promise.resolve({ namespace, route }),
  searchParams: Promise.resolve({})
});

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  editor.enabled = false;
  vi.stubEnv('NODE_ENV', 'production');
  loaders.getSharedConfig.mockResolvedValue({
    header: { homeLink: './index', logo: './logo.svg' }
  });
  loaders.loadSitemap.mockResolvedValue(['/docs/index', '/about', '/quickstart']);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe.each(['active', 'snapshot-file'] as const)('document routing in %s mode', mode => {
  beforeEach(() => {
    vi.stubEnv('MOSAIC_MODE', mode);
    loaders.resolveMosaicMode.mockReturnValue({ mode, contentUrl: 'http://content' });
    loaders.getMdxRaw.mockImplementation(async (pathname: string) => {
      if (pathname === '/about') return document('About', '/about');
      if (pathname === '/quickstart') return document('Quick start', '/docs/start/index');
      if (pathname === '/docs/index') return document('Docs home', '/docs/index');
      if (pathname === '/docs') {
        return mode === 'active'
          ? { kind: 'redirect', destination: '/docs/index' }
          : document('Docs home', '/docs/index');
      }
      return { kind: 'not-found' };
    });
  });

  test('renders a root-level document without inventing an index redirect', async () => {
    const { default: Page } = await import('../page');
    const html = renderToStaticMarkup(await Page(request('about')));

    expect(html).toContain('<article>About</article>');
    expect(html).toContain('data-frame-route="/about"');
    expect(loaders.getMdxRaw).toHaveBeenCalledWith('/about', mode, 'http://content');
    expect(loaders.getMdxRaw).not.toHaveBeenCalledWith('/about/index', mode, 'http://content');
  });

  test('keeps the canonical route of a root-level alias for the header and metadata', async () => {
    const { default: Page, generateMetadata } = await import('../page');
    const html = renderToStaticMarkup(await Page(request('quickstart')));
    const metadata = await generateMetadata(request('quickstart'));

    expect(html).toContain('<article>Quick start</article>');
    expect(html).toContain('data-frame-route="/docs/start/index"');
    expect(html).not.toContain('data-canonical-url');
    expect(metadata.alternates?.canonical).toBe('/docs/start/index');
  });

  test('continues to resolve a real top-level folder index', async () => {
    const { default: Page } = await import('../page');
    const html = renderToStaticMarkup(await Page(request('docs')));

    expect(html).toContain('<article>Docs home</article>');
    expect(html).toContain('data-frame-route="/docs/index"');
    expect(html).toContain('data-canonical-url="/docs/index"');
  });

  test('returns a 404 for a missing single-segment document', async () => {
    const { default: Page } = await import('../page');

    await expect(Page(request('missing'))).rejects.toThrow('not-found');
  });
});

describe('static document paths', () => {
  test('splits root documents, aliases and index shorthand paths from deeper pages', async () => {
    vi.stubEnv('MOSAIC_MODE', 'snapshot-file');
    loaders.loadSitemap.mockResolvedValue([
      '/docs/index',
      '/about',
      '/quickstart',
      '/docs/index',
      '/other/page'
    ]);
    const { generateStaticParams } = await import('../page');
    const { generateStaticParams: generateNamespaceParams } = await import('../../page');

    // An optional catch-all would also have to serve `/docs` (route: [])
    // next to `/docs/index`. Next.js treats a lone `index` in an optional
    // catch-all as empty, so the two collided.
    expect(await generateStaticParams()).toEqual([
      { namespace: 'docs', route: ['index'] },
      { namespace: 'other', route: ['page'] }
    ]);
    expect(await generateNamespaceParams()).toEqual([
      { namespace: 'docs' },
      { namespace: 'about' },
      { namespace: 'quickstart' }
    ]);
  });

  test('probes active-mode rendering without reading content or the sitemap', async () => {
    vi.stubEnv('MOSAIC_MODE', 'active');
    const { default: Page, generateStaticParams } = await import('../page');
    const { default: NamespacePage, generateStaticParams: generateNamespaceParams } = await import(
      '../../page'
    );

    const [probe] = await generateStaticParams();
    const [namespaceProbe] = await generateNamespaceParams();
    expect(probe).toEqual({ namespace: '__mosaic_dynamic_probe__', route: ['index'] });
    expect(namespaceProbe).toEqual({ namespace: '__mosaic_dynamic_probe__' });
    expect(loaders.loadSitemap).not.toHaveBeenCalled();
    connection.mockRejectedValue(new Error('prerender stops at connection'));
    await expect(Page(request(probe.namespace, probe.route))).rejects.toThrow(
      'prerender stops at connection'
    );
    await expect(NamespacePage(request(namespaceProbe.namespace))).rejects.toThrow(
      'prerender stops at connection'
    );
    connection.mockReset();
    expect(loaders.getMdxRaw).not.toHaveBeenCalled();
    expect(loaders.getSharedConfig).not.toHaveBeenCalled();
  });
});

describe('namespace root page', () => {
  beforeEach(() => {
    vi.stubEnv('MOSAIC_MODE', 'snapshot-file');
    loaders.resolveMosaicMode.mockReturnValue({ mode: 'snapshot-file', contentUrl: '' });
    loaders.getMdxRaw.mockImplementation(async (pathname: string) =>
      pathname === '/about' ? document('About', '/about') : { kind: 'not-found' }
    );
  });

  test('renders a root-level document like the catch-all page', async () => {
    const { default: NamespacePage, generateMetadata } = await import('../../page');
    const html = renderToStaticMarkup(await NamespacePage(request('about')));
    const metadata = await generateMetadata(request('about'));

    expect(html).toContain('<article>About</article>');
    expect(html).toContain('data-frame-route="/about"');
    expect(metadata.title).toBe('About');
  });

  test('returns a 404 for a missing namespace root', async () => {
    const { default: NamespacePage } = await import('../../page');

    await expect(NamespacePage(request('missing'))).rejects.toThrow('not-found');
  });
});

describe('alias editor context', () => {
  beforeEach(() => {
    vi.stubEnv('MOSAIC_MODE', 'active');
    editor.enabled = true;
    loaders.resolveMosaicMode.mockReturnValue({ mode: 'active', contentUrl: 'http://content' });
    loaders.getMdxRaw.mockResolvedValue({
      kind: 'mdx',
      raw: '# Start',
      frontmatter: { title: 'Start', route: '/docs/start/index', fullPath: '/docs/start/index.mdx' }
    });
    loaders.getSharedConfig.mockImplementation(async (pathname: string) =>
      pathname === '/docs/start/index.mdx'
        ? { header: { title: 'Target header' }, sourceCapabilities: { writable: true } }
        : undefined
    );
    loaders.getMdxRawSource.mockResolvedValue({ kind: 'raw', bytes: '# Start', namespace: 'docs' });
  });

  test('loads and edits the backing file while the header uses the canonical URL', async () => {
    const { default: Page } = await import('../page');
    const html = renderToStaticMarkup(
      await Page({
        ...request('quickstart'),
        searchParams: Promise.resolve({ edit: '1' })
      })
    );

    expect(loaders.getMdxRawSource).toHaveBeenCalledWith(
      '/docs/start/index.mdx',
      'active',
      'http://content'
    );
    expect(html).toContain('data-editor-route="/docs/start/index.mdx"');
    expect(html).toContain('data-frame-route="/docs/start/index"');
    expect(html).toContain('data-frame-title="Target header"');
  });

  test('redirects an existing alias create request to its public edit URL', async () => {
    const { default: Page } = await import('../page');
    await expect(
      Page({ ...request('quickstart'), searchParams: Promise.resolve({ new: '1' }) })
    ).rejects.toThrow('redirect: /docs/start/index?edit=1&existed=1');
  });

  test('keeps per-page header precedence without accepting authored write capabilities', async () => {
    loaders.getMdxRaw.mockResolvedValue({
      kind: 'mdx',
      raw: '# Start',
      frontmatter: {
        title: 'Start',
        route: '/docs/start/index',
        fullPath: '/docs/start/index.mdx',
        sharedConfig: { header: { title: 'Page override' }, sourceCapabilities: { writable: true } }
      }
    });
    loaders.getSharedConfig.mockResolvedValue({
      header: { title: 'Source header' },
      sourceCapabilities: { writable: false }
    });
    const { default: Page } = await import('../page');
    const html = renderToStaticMarkup(
      await Page({ ...request('quickstart'), searchParams: Promise.resolve({ edit: '1' }) })
    );

    expect(html).toContain('data-frame-title="Page override"');
    expect(html).not.toContain('data-editor-route');
    expect(loaders.getMdxRawSource).not.toHaveBeenCalled();
  });
});
