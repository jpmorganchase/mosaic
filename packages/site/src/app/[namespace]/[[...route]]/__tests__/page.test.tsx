import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const loaders = vi.hoisted(() => ({
  getMdxRaw: vi.fn(),
  getSharedConfig: vi.fn(),
  loadSitemap: vi.fn(),
  resolveMosaicMode: vi.fn()
}));

vi.mock('@jpmorganchase/mosaic-site-middleware', () => ({
  ...loaders,
  getMdxRawSource: vi.fn(),
  serializeMdxForClient: async () => ({ compiledSource: '', frontmatter: {} })
}));
vi.mock('next/server', () => ({ connection: async () => {} }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not-found');
  },
  redirect: (destination: string) => {
    throw new Error(`redirect: ${destination}`);
  }
}));
vi.mock('../../../../auth', () => ({
  AUTH_ENABLED: false,
  auth: async () => null,
  isAuthorizedEditor: () => false
}));
vi.mock('../../../providers', () => ({
  StoreShell: ({ children }: { children: ReactNode }) => children
}));
vi.mock('../../NamespaceFrame', () => ({
  FrameSync: ({ route }: { route: string }) => <span data-frame-route={route} />
}));
vi.mock('../BodyServer', () => ({
  BodyServer: ({ raw }: { raw: string }) => <article>{raw}</article>
}));
vi.mock('../EditorBodyLazy', () => ({ EditorBodyLazy: () => null }));
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
  vi.stubEnv('NODE_ENV', 'production');
  loaders.getSharedConfig.mockResolvedValue({
    header: { homeLink: './index', logo: './logo.svg' }
  });
  loaders.loadSitemap.mockResolvedValue(['/docs/index', '/about', '/quickstart']);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe.each(['active', 'snapshot-file', 'snapshot-s3'] as const)(
  'document routing in %s mode',
  mode => {
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
  }
);

describe('static document paths', () => {
  test('includes root documents, aliases and known index shorthand paths', async () => {
    vi.stubEnv('MOSAIC_MODE', 'snapshot-file');
    loaders.loadSitemap.mockResolvedValue([
      '/docs/index',
      '/about',
      '/quickstart',
      '/docs/index',
      '/other/page'
    ]);
    const { generateStaticParams } = await import('../page');

    expect(await generateStaticParams()).toEqual([
      { namespace: 'docs', route: ['index'] },
      { namespace: 'docs', route: [] },
      { namespace: 'about', route: [] },
      { namespace: 'quickstart', route: [] },
      { namespace: 'other', route: ['page'] }
    ]);
  });

  test('leaves active-mode paths to request-time resolution', async () => {
    vi.stubEnv('MOSAIC_MODE', 'active');
    const { generateStaticParams } = await import('../page');

    expect(await generateStaticParams()).toEqual([]);
    expect(loaders.loadSitemap).not.toHaveBeenCalled();
  });
});
