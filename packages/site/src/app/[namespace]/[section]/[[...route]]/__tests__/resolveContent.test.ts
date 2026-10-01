import { beforeEach, describe, expect, test, vi } from 'vitest';

const getMdxRaw = vi.fn();
const getSharedConfig = vi.fn();
vi.mock('@jpmorganchase/mosaic-site-middleware', () => ({ getMdxRaw, getSharedConfig }));
// `React.cache` only memoises inside a server render; make it a no-op so
// every call reaches the mocked loaders.
vi.mock('react', async () => ({
  ...(await vi.importActual<typeof import('react')>('react')),
  cache: <T>(fn: T) => fn
}));

const { MAX_INTERNAL_REDIRECT_HOPS, canonicalRoute, isFolderIndexRedirect, resolveContent } =
  await import('../resolveContent');

const mdx = (title: string) => ({ kind: 'mdx', raw: `# ${title}`, frontmatter: { title } });
const sharedConfigFor = (pathname: string) => ({ header: { title: `header for ${pathname}` } });

beforeEach(() => {
  getMdxRaw.mockReset();
  getSharedConfig.mockReset();
  getSharedConfig.mockImplementation(async (pathname: string) => sharedConfigFor(pathname));
});

describe('resolveContent', () => {
  test('returns the page and its shared config', async () => {
    getMdxRaw.mockResolvedValue(mdx('Page'));

    const resolved = await resolveContent('/docs/page', 'active', 'http://content');

    expect(resolved).toEqual({
      kind: 'mdx',
      originalPathname: '/docs/page',
      pathname: '/docs/page',
      mdx: mdx('Page'),
      sharedConfig: sharedConfigFor('/docs/page')
    });
    expect(getMdxRaw).toHaveBeenCalledWith('/docs/page', 'active', 'http://content');
  });

  test('follows a folder→index redirect and loads the index shared config', async () => {
    getMdxRaw.mockImplementation(async (pathname: string) =>
      pathname === '/docs/folder'
        ? { kind: 'redirect', destination: '/docs/folder/index' }
        : mdx('Index')
    );

    const resolved = await resolveContent('/docs/folder', 'active', 'http://content');

    expect(resolved).toMatchObject({
      kind: 'mdx',
      originalPathname: '/docs/folder',
      pathname: '/docs/folder/index',
      sharedConfig: sharedConfigFor('/docs/folder/index')
    });
    expect(getMdxRaw.mock.calls.map(([pathname]) => pathname)).toEqual([
      '/docs/folder',
      '/docs/folder/index'
    ]);
  });

  test('surfaces any other redirect to the caller', async () => {
    getMdxRaw.mockResolvedValue({ kind: 'redirect', destination: '/docs/moved' });

    const resolved = await resolveContent('/docs/old', 'active', 'http://content');

    expect(resolved).toEqual({ kind: 'redirect', destination: '/docs/moved' });
  });

  test('keeps the shared config of the folder a missing page would live in', async () => {
    // The create-page flow (`?new=1`) checks this config for writability.
    getMdxRaw.mockResolvedValue({ kind: 'not-found' });
    getSharedConfig.mockResolvedValue({ sourceCapabilities: { writable: true } });

    const resolved = await resolveContent('/docs/new-page', 'active', 'http://content');

    expect(resolved).toEqual({
      kind: 'not-found',
      originalPathname: '/docs/new-page',
      pathname: '/docs/new-page',
      sharedConfig: { sourceCapabilities: { writable: true } }
    });
  });

  test('gives up after the hop budget and treats the route as not found', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    getMdxRaw.mockImplementation(async (pathname: string) => ({
      kind: 'redirect',
      destination: `${pathname}/index`
    }));

    const resolved = await resolveContent('/loop', 'active', 'http://content');

    expect(resolved).toMatchObject({ kind: 'not-found', sharedConfig: undefined });
    expect(getMdxRaw).toHaveBeenCalledTimes(MAX_INTERNAL_REDIRECT_HOPS + 1);
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });
});

describe('isFolderIndexRedirect', () => {
  test.each([
    ['/docs/folder', '/docs/folder/index', true],
    ['/docs/folder/', '/docs/folder/index', true],
    ['/docs/folder', '/docs/other/index', false],
    ['/docs/folder', '/docs/folder', false],
    ['/docs/folder', '/docs/folder/index/index', false]
  ])('%s → %s is %s', (from, destination, expected) => {
    expect(isFolderIndexRedirect(from, destination)).toBe(expected);
  });
});

describe('canonicalRoute', () => {
  test('uses the route Mosaic stamped into the frontmatter', () => {
    expect(canonicalRoute({ route: '/docs/folder/index' }, '/docs/folder')).toBe(
      '/docs/folder/index'
    );
  });

  test.each([undefined, 42, 'docs/relative', '/docs/../escape', ''])(
    'falls back to the resolved pathname when the route is %j',
    route => {
      expect(canonicalRoute({ route }, '/docs/page')).toBe('/docs/page');
    }
  );
});
