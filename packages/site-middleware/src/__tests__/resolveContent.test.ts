import { beforeEach, describe, expect, test, vi } from 'vitest';

const getMdxRaw = vi.fn();
const getSharedConfig = vi.fn();
const newPageWritable = vi.fn();
vi.mock('../cachedLoaders.js', () => ({ getMdxRaw, getSharedConfig }));
vi.mock('../newPageSources.js', () => ({ newPageWritable }));
// `React.cache` only memoises inside a server render; make it a no-op so
// every call reaches the mocked loaders.
vi.mock('react', async () => ({
  ...(await vi.importActual<typeof import('react')>('react')),
  cache: <T>(fn: T) => fn
}));

const {
  MAX_INTERNAL_REDIRECT_HOPS,
  MAX_NEW_PAGE_CONFIG_LOOKUPS,
  canonicalRoute,
  getNewPageSharedConfig,
  isFolderIndexRedirect,
  mergePageSharedConfig,
  resolveContent
} = await import('../resolveContent.js');

const mdx = (title: string) => ({ kind: 'mdx', raw: `# ${title}`, frontmatter: { title } });
const sharedConfigFor = (pathname: string) => ({ header: { title: `header for ${pathname}` } });

beforeEach(() => {
  getMdxRaw.mockReset();
  getSharedConfig.mockReset();
  newPageWritable.mockReset().mockResolvedValue(undefined);
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
      sourcePathname: '/docs/page',
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

  test('does not reread a normal document config just because fullPath has an extension', async () => {
    getMdxRaw.mockResolvedValue({
      ...mdx('Page'),
      frontmatter: { route: '/docs/page', fullPath: '/docs/page.mdx' }
    });

    expect(await resolveContent('/docs/page', 'active', 'http://content')).toMatchObject({
      pathname: '/docs/page',
      sourcePathname: '/docs/page.mdx',
      sharedConfig: sharedConfigFor('/docs/page')
    });
    expect(getSharedConfig).toHaveBeenCalledTimes(1);
  });

  test('does not borrow alias-folder capabilities when the backing config is missing', async () => {
    getMdxRaw.mockResolvedValue({
      ...mdx('Page'),
      frontmatter: { route: '/docs/page', fullPath: '/docs/page.mdx' }
    });
    getSharedConfig.mockImplementation(async (pathname: string) =>
      pathname === '/alias' ? { sourceCapabilities: { writable: true } } : undefined
    );

    expect(await resolveContent('/alias', 'active', 'http://content')).toMatchObject({
      sourcePathname: '/docs/page.mdx',
      sharedConfig: undefined
    });
  });

  test('ignores unsafe source metadata instead of selecting another folder', async () => {
    getMdxRaw.mockResolvedValue({
      ...mdx('Page'),
      frontmatter: { route: '/public/page', fullPath: '/docs/../other/page.mdx' }
    });

    expect(await resolveContent('/docs/page', 'active', 'http://content')).toMatchObject({
      pathname: '/public/page',
      sourcePathname: '/docs/page',
      sharedConfig: sharedConfigFor('/docs/page')
    });
    expect(getSharedConfig).toHaveBeenCalledTimes(1);
  });

  test('decodes the backing path fallback without changing the public URL', async () => {
    getMdxRaw.mockResolvedValue(mdx('Legacy page'));
    const pathname = '/docs/100%25/page';

    expect(await resolveContent(pathname, 'active', 'http://content')).toMatchObject({
      pathname,
      sourcePathname: '/docs/100%/page',
      sharedConfig: sharedConfigFor(pathname)
    });
  });

  test("puts the page's authored shared config over its folder's", async () => {
    const page = {
      kind: 'mdx',
      raw: '# Page',
      frontmatter: { title: 'Page', sharedConfig: { footer: { title: 'Page footer' } } }
    };
    getMdxRaw.mockResolvedValue(page);
    getSharedConfig.mockResolvedValue({
      header: { title: 'Folder header' },
      footer: { title: 'Folder footer' }
    });

    const resolved = await resolveContent('/docs/page', 'active', 'http://content');

    const merged = { header: { title: 'Folder header' }, footer: { title: 'Page footer' } };
    expect(resolved).toMatchObject({
      sharedConfig: merged,
      mdx: { frontmatter: { sharedConfig: merged } }
    });
    // The loaders' results are cached, so they must not be changed.
    expect(page.frontmatter.sharedConfig).toEqual({ footer: { title: 'Page footer' } });
  });

  test("never takes source capabilities from the page's frontmatter", async () => {
    getMdxRaw.mockResolvedValue({
      ...mdx('Page'),
      frontmatter: {
        title: 'Page',
        sharedConfig: { sourceCapabilities: { writable: true }, footer: { title: 'Page footer' } }
      }
    });
    getSharedConfig.mockResolvedValue({ header: { title: 'Folder header' } });

    const resolved = await resolveContent('/docs/page', 'active', 'http://content');

    const merged = { header: { title: 'Folder header' }, footer: { title: 'Page footer' } };
    expect(resolved).toMatchObject({
      sharedConfig: merged,
      mdx: { frontmatter: { sharedConfig: merged } }
    });
    expect(resolved.kind === 'mdx' && resolved.sharedConfig).not.toHaveProperty(
      'sourceCapabilities'
    );
    expect(resolved.kind === 'mdx' && resolved.mdx.frontmatter.sharedConfig).not.toHaveProperty(
      'sourceCapabilities'
    );
  });

  test('surfaces any other redirect to the caller', async () => {
    getMdxRaw.mockResolvedValue({ kind: 'redirect', destination: '/docs/moved' });

    const resolved = await resolveContent('/docs/old', 'active', 'http://content');

    expect(resolved).toEqual({ kind: 'redirect', destination: '/docs/moved' });
  });

  test('keeps the shared config of the folder a missing page would live in', async () => {
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

  test('returns a miss when config is unavailable without loading creation metadata', async () => {
    getMdxRaw.mockResolvedValue({ kind: 'not-found' });
    getSharedConfig.mockRejectedValue(new Error('Config unavailable'));
    newPageWritable.mockRejectedValue(new Error('Creation metadata unavailable'));

    await expect(
      resolveContent('/docs/missing', 'active', 'http://content')
    ).resolves.toMatchObject({
      kind: 'not-found',
      sharedConfig: undefined
    });
    expect(newPageWritable).not.toHaveBeenCalled();
  });

  test("uses the nearest existing folder's config when preparing a new page", async () => {
    const writable = { sourceCapabilities: { writable: true } };
    // `getSharedConfig` reads the config of the folder a page is in.
    getSharedConfig.mockImplementation(async (pathname: string) =>
      pathname === '/docs/index' ? writable : undefined
    );

    const config = await getNewPageSharedConfig('/docs/new/deeper', 'active', 'http://content');

    expect(config).toEqual(writable);
    expect(getSharedConfig.mock.calls.map(([pathname]) => pathname)).toEqual([
      '/docs/new/deeper/index',
      '/docs/new/index',
      '/docs/index'
    ]);
  });

  test('has no creation config for a page outside every folder with one', async () => {
    getSharedConfig.mockResolvedValue(undefined);

    const config = await getNewPageSharedConfig('/unknown', 'active', 'http://content');

    expect(config).toBeUndefined();
    expect(getSharedConfig.mock.calls.map(([pathname]) => pathname)).toEqual([
      '/unknown/index',
      '/index'
    ]);
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

describe('mergePageSharedConfig', () => {
  test("keeps the folder's source capabilities", () => {
    expect(
      mergePageSharedConfig(
        { sourceCapabilities: { writable: false }, header: { title: 'Folder' } },
        { sourceCapabilities: { writable: true }, header: { title: 'Page' } }
      )
    ).toEqual({ sourceCapabilities: { writable: false }, header: { title: 'Page' } });
  });

  test('returns the folder config when the page authors nothing usable', () => {
    const folder = { header: { title: 'Folder' } };
    expect(mergePageSharedConfig(folder, undefined)).toBe(folder);
    expect(mergePageSharedConfig(folder, 'header')).toBe(folder);
    expect(mergePageSharedConfig(folder, ['header'])).toBe(folder);
  });

  test('uses the page config when the folder has none', () => {
    expect(mergePageSharedConfig(undefined, { footer: { title: 'Page' } })).toEqual({
      footer: { title: 'Page' }
    });
  });
});

describe('getNewPageSharedConfig', () => {
  test("returns the folder's own config", async () => {
    expect(await getNewPageSharedConfig('/docs/guides', 'active', 'http://content')).toEqual(
      sharedConfigFor('/docs/guides/index')
    );
    expect(getSharedConfig).toHaveBeenCalledOnce();
  });

  test('walks up to the root and stops there', async () => {
    getSharedConfig.mockResolvedValue(undefined);

    expect(await getNewPageSharedConfig('/a/b/', 'active', 'http://content')).toBeUndefined();
    expect(getSharedConfig.mock.calls.map(([pathname]) => pathname)).toEqual([
      '/a/b/index',
      '/a/index',
      '/index'
    ]);
  });

  test('reads the root config for the root folder', async () => {
    expect(await getNewPageSharedConfig('/', 'active', 'http://content')).toEqual(
      sharedConfigFor('/index')
    );
  });

  test('ignores a relative folder', async () => {
    expect(await getNewPageSharedConfig('docs', 'active', 'http://content')).toBeUndefined();
    expect(getSharedConfig).not.toHaveBeenCalled();
  });

  test('takes writability from the creation metadata over the layout config', async () => {
    newPageWritable.mockResolvedValue(true);
    getSharedConfig.mockImplementation(async (pathname: string) =>
      pathname === '/docs/index'
        ? { header: { title: 'Docs' }, sourceCapabilities: { writable: false } }
        : undefined
    );

    expect(await getNewPageSharedConfig('/docs/new', 'active', 'http://content')).toEqual({
      header: { title: 'Docs' },
      sourceCapabilities: { writable: true }
    });
    expect(newPageWritable).toHaveBeenCalledWith('/docs/new', 'active', 'http://content');
  });

  test("doesn't look for config in a folder the metadata says isn't writable", async () => {
    newPageWritable.mockResolvedValue(false);

    expect(await getNewPageSharedConfig('/docs/new', 'active', 'http://content')).toEqual({
      sourceCapabilities: { writable: false }
    });
    expect(getSharedConfig).not.toHaveBeenCalled();
  });

  test('looks for config in a folder the transform makes writable', async () => {
    newPageWritable.mockResolvedValue(false);
    const bypass = vi.fn((config: Record<string, unknown> | undefined) => ({
      ...config,
      sourceCapabilities: { writable: true }
    }));

    expect(
      await getNewPageSharedConfig('/docs/new', 'active', 'http://content', {
        transformSharedConfig: bypass
      })
    ).toEqual({ ...sharedConfigFor('/docs/new/index'), sourceCapabilities: { writable: true } });
    expect(bypass).toHaveBeenCalledWith({ sourceCapabilities: { writable: false } });
    expect(getSharedConfig).toHaveBeenCalledOnce();
  });

  test.each([true, false])(
    'only reads the metadata for capabilities when it says writable is %s',
    async writable => {
      newPageWritable.mockResolvedValue(writable);

      expect(
        await getNewPageSharedConfig('/docs/new', 'active', 'http://content', {
          capabilitiesOnly: true
        })
      ).toEqual({ sourceCapabilities: { writable } });
      expect(getSharedConfig).not.toHaveBeenCalled();
    }
  );

  test('still searches folders for capabilities without the metadata', async () => {
    getSharedConfig.mockImplementation(async (pathname: string) =>
      pathname === '/docs/index' ? { sourceCapabilities: { writable: true } } : undefined
    );

    expect(
      await getNewPageSharedConfig('/docs/new', 'active', 'http://content', {
        capabilitiesOnly: true
      })
    ).toEqual({ sourceCapabilities: { writable: true } });
    expect(getSharedConfig).toHaveBeenCalledTimes(2);
  });

  describe('in a very deep folder', () => {
    const folder = (depth: number) => `/${Array.from({ length: depth }, () => 'a').join('/')}`;

    test.each([undefined, true])(
      'reads a bounded number of folders when the metadata says %s',
      async writable => {
        newPageWritable.mockResolvedValue(writable);
        getSharedConfig.mockResolvedValue(undefined);

        const config = await getNewPageSharedConfig(folder(8000), 'active', 'http://content');

        expect(config).toEqual(
          writable === undefined ? undefined : { sourceCapabilities: { writable } }
        );
        expect(getSharedConfig).toHaveBeenCalledTimes(MAX_NEW_PAGE_CONFIG_LOOKUPS);
        expect(getSharedConfig).toHaveBeenLastCalledWith(
          `${folder(8000 - MAX_NEW_PAGE_CONFIG_LOOKUPS + 1)}/index`,
          'active',
          'http://content'
        );
      }
    );

    test('reaches the root from the deepest folder within the limit', async () => {
      getSharedConfig.mockImplementation(async (pathname: string) =>
        pathname === '/index' ? sharedConfigFor(pathname) : undefined
      );

      expect(
        await getNewPageSharedConfig(
          folder(MAX_NEW_PAGE_CONFIG_LOOKUPS - 1),
          'active',
          'http://content'
        )
      ).toEqual(sharedConfigFor('/index'));
      getSharedConfig.mockClear();
      expect(
        await getNewPageSharedConfig(
          folder(MAX_NEW_PAGE_CONFIG_LOOKUPS),
          'active',
          'http://content'
        )
      ).toBeUndefined();
      expect(getSharedConfig).not.toHaveBeenCalledWith('/index', 'active', 'http://content');
    });
  });
});
