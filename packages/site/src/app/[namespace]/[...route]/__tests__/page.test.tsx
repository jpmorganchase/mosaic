import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const loaders = vi.hoisted(() => ({
  getMdxRaw: vi.fn(),
  getSharedConfig: vi.fn(),
  getMdxRawSource: vi.fn(),
  loadSitemap: vi.fn(),
  generateMosaicStaticParams: vi.fn(),
  resolveMosaicMode: vi.fn()
}));
const newPageSources = vi.hoisted(() => ({ newPageWritable: vi.fn() }));
const editor = vi.hoisted(() => ({ enabled: false, signedIn: true }));
const connection = vi.hoisted(() => vi.fn(async () => {}));

vi.mock('../../../../../../site-middleware/src/cachedLoaders.js', () => loaders);
vi.mock('../../../../../../site-middleware/src/newPageSources.js', () => newPageSources);
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
  auth: async () => (editor.enabled && editor.signedIn ? { user: { name: 'Editor' } } : null),
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
  editor.signedIn = true;
  vi.stubEnv('NODE_ENV', 'production');
  loaders.getSharedConfig.mockResolvedValue({
    header: { homeLink: './index', logo: './logo.svg' }
  });
  loaders.loadSitemap.mockResolvedValue(['/docs/index', '/about', '/quickstart']);
  loaders.generateMosaicStaticParams.mockResolvedValue([
    { namespace: 'docs', route: [] },
    { namespace: 'docs', route: ['index'] },
    { namespace: 'about', route: [] },
    { namespace: 'quickstart', route: [] }
  ]);
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

  test('composes reusable metadata with the existing host social branding unchanged', async () => {
    loaders.getMdxRaw.mockResolvedValue({
      kind: 'mdx',
      raw: 'Content',
      frontmatter: {
        title: 'Title',
        description: 'Description',
        route: '/docs/page',
        image: '/brand.png',
        lastModified: 42,
        breadcrumbs: [{ label: 'Docs' }]
      }
    });
    const { generateMetadata } = await import('../page');
    expect(await generateMetadata(request('alias'))).toEqual({
      title: 'Title',
      description: 'Description',
      alternates: { canonical: '/docs/page' },
      other: { lastModified: '42', breadcrumbs: '[{"label":"Docs"}]' },
      openGraph: {
        type: 'article',
        title: 'Title',
        description: 'Description',
        images: [{ url: '/brand.png' }]
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Title',
        description: 'Description',
        images: ['/brand.png']
      }
    });
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

  test('encodes decoded Next params exactly once for the content loader', async () => {
    loaders.getMdxRaw.mockResolvedValue(document('Encoded page', '/docs space/café%20'));
    const { default: Page } = await import('../page');
    renderToStaticMarkup(await Page(request('docs space', ['café%20'])));
    expect(loaders.getMdxRaw).toHaveBeenCalledWith(
      '/docs%20space/caf%C3%A9%2520',
      mode,
      'http://content'
    );
  });
});

describe('static document paths', () => {
  test('splits root documents, aliases and index shorthand paths from deeper pages', async () => {
    vi.stubEnv('MOSAIC_MODE', 'snapshot-file');
    loaders.generateMosaicStaticParams.mockResolvedValue([
      { namespace: 'docs', route: [] },
      { namespace: 'docs', route: ['index'] },
      { namespace: 'about', route: [] },
      { namespace: 'quickstart', route: [] },
      { namespace: 'other', route: ['page'] }
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
    expect(loaders.generateMosaicStaticParams).toHaveBeenCalledWith({ pageExtensions: ['.mdx'] });
    expect(loaders.loadSitemap).not.toHaveBeenCalled();
  });

  test('propagates invalid inventory failures from the shared production helper', async () => {
    vi.stubEnv('MOSAIC_MODE', 'snapshot-file');
    loaders.generateMosaicStaticParams.mockRejectedValue(new Error('Invalid mosaic-routes.json'));
    const { generateStaticParams } = await import('../page');

    await expect(generateStaticParams()).rejects.toThrow('Invalid mosaic-routes.json');
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
    expect(loaders.generateMosaicStaticParams).not.toHaveBeenCalled();
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

describe('create requests', () => {
  const create = () => ({
    ...request('docs', ['guides', 'new-page']),
    searchParams: Promise.resolve({ new: '1', title: 'New page' })
  });

  beforeEach(() => {
    vi.stubEnv('MOSAIC_MODE', 'active');
    editor.enabled = true;
    loaders.resolveMosaicMode.mockReturnValue({ mode: 'active', contentUrl: 'http://content' });
    loaders.getMdxRaw.mockResolvedValue({ kind: 'not-found' });
    loaders.getSharedConfig.mockImplementation(async (pathname: string) =>
      pathname === '/docs/index' ? { header: { title: 'Docs' } } : undefined
    );
    newPageSources.newPageWritable.mockResolvedValue(true);
  });

  test('opens the editor in a new folder with the layout config of the folder above', async () => {
    const { default: Page } = await import('../page');
    const html = renderToStaticMarkup(await Page(create()));

    expect(html).toContain('data-editor-route="/docs/guides/new-page"');
    expect(html).toContain('data-frame-title="Docs"');
  });

  test.each([
    ['auth is off', { enabled: false }],
    ['nobody is signed in', { signedIn: false }]
  ])("doesn't look up the new page's folder when %s", async (_, state) => {
    Object.assign(editor, state);
    const { default: Page } = await import('../page');

    await expect(Page(create())).rejects.toThrow('not-found');
    expect(newPageSources.newPageWritable).not.toHaveBeenCalled();
    // Only `resolveContent`'s read of the requested page's folder.
    expect(loaders.getSharedConfig).toHaveBeenCalledOnce();
  });

  test("doesn't search for layout config in a folder new pages can't be created in", async () => {
    newPageSources.newPageWritable.mockResolvedValue(false);
    const { default: Page } = await import('../page');

    await expect(Page(create())).rejects.toThrow('not-found');
    expect(newPageSources.newPageWritable).toHaveBeenCalledOnce();
    expect(loaders.getSharedConfig).toHaveBeenCalledOnce();
  });

  test('keeps the layout config of a folder the dev bypass makes writable', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('MOSAIC_DEV_BYPASS_CAPABILITY_GATE', 'true');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    newPageSources.newPageWritable.mockResolvedValue(false);
    const { default: Page } = await import('../page');
    const html = renderToStaticMarkup(await Page(create()));

    expect(html).toContain('data-editor-route="/docs/guides/new-page"');
    expect(html).toContain('data-frame-title="Docs"');
    warn.mockRestore();
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

describe('authoring site', () => {
  beforeEach(() => {
    vi.stubEnv('MOSAIC_MODE', 'active');
    vi.stubEnv('MOSAIC_AUTHORING_URL', 'https://dev.example.com/');
    editor.enabled = true;
    loaders.resolveMosaicMode.mockReturnValue({ mode: 'active', contentUrl: 'http://content' });
    loaders.getMdxRaw.mockImplementation(async (pathname: string) =>
      pathname === '/docs/index' ? document('Docs home', '/docs/index') : { kind: 'not-found' }
    );
    loaders.getSharedConfig.mockResolvedValue({ sourceCapabilities: { writable: true } });
  });

  test('sends an edit request to the same page on the authoring site', async () => {
    const { default: Page } = await import('../page');
    await expect(
      Page({ ...request('docs', ['index']), searchParams: Promise.resolve({ edit: '1' }) })
    ).rejects.toThrow('redirect: https://dev.example.com/docs/index?edit=1');
    expect(loaders.getMdxRawSource).not.toHaveBeenCalled();
  });

  test('sends a create request there with its title', async () => {
    const { default: Page } = await import('../page');
    await expect(
      Page({
        ...request('docs', ['new.mdx']),
        searchParams: Promise.resolve({ new: '1', title: 'A new page' })
      })
    ).rejects.toThrow('redirect: https://dev.example.com/docs/new.mdx?new=1&title=A+new+page');
  });

  test('renders a page as usual', async () => {
    const { default: Page } = await import('../page');
    const html = renderToStaticMarkup(await Page(request('docs', ['index'])));
    expect(html).toContain('Docs home');
  });
});
