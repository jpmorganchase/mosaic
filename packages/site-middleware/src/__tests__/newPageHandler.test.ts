import { beforeEach, describe, expect, test, vi } from 'vitest';

const getSharedConfig = vi.fn();
const newPageWritable = vi.fn();
vi.mock('../cachedLoaders.js', () => ({ getMdxRaw: vi.fn(), getSharedConfig }));
vi.mock('../newPageSources.js', () => ({ newPageWritable }));
vi.mock('react', async () => ({
  ...(await vi.importActual<typeof import('react')>('react')),
  cache: <T>(fn: T) => fn
}));

const { createNewPageHandler } = await import('../newPageHandler.js');
const { MAX_NEW_PAGE_CONFIG_LOOKUPS } = await import('../resolveContent.js');

const configs: Record<string, unknown> = {
  '/docs/index': { sourceCapabilities: { writable: true } },
  '/docs/release-notes/index': { sourceCapabilities: { writable: false } }
};

const check = async (handler: ReturnType<typeof createNewPageHandler>, folder?: string) => {
  const query = folder === undefined ? '' : `?folder=${encodeURIComponent(folder)}`;
  const response = await handler(new Request(`http://localhost/api/content/new-page${query}`));
  return { status: response.status, body: await response.json(), response };
};

beforeEach(() => {
  // Older content servers publish no creation metadata.
  newPageWritable.mockReset().mockResolvedValue(undefined);
  getSharedConfig.mockReset();
  getSharedConfig.mockImplementation(async (pathname: string) => configs[pathname]);
});

describe('createNewPageHandler', () => {
  const handler = createNewPageHandler({ mode: 'active', contentUrl: 'http://content' });

  test('allows an existing folder in a writable source', async () => {
    expect((await check(handler, '/docs')).body).toEqual({ folder: '/docs', writable: true });
  });

  test("allows a new folder below a writable source's folder", async () => {
    expect((await check(handler, '/docs/new/folder/')).body).toEqual({
      folder: '/docs/new/folder',
      writable: true
    });
  });

  test('refuses a folder served by a read-only source', async () => {
    expect((await check(handler, '/docs/release-notes/new')).body).toEqual({
      folder: '/docs/release-notes/new',
      writable: false
    });
  });

  test('refuses a folder outside every source', async () => {
    expect((await check(handler, '/test')).body).toEqual({ folder: '/test', writable: false });
  });

  test('is never cached', async () => {
    const { response } = await check(handler, '/docs');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  test.each([undefined, '', 'docs', '/docs/../secret', '/docs\\x'])(
    'rejects the folder %j',
    async folder => {
      expect(await check(handler, folder)).toMatchObject({
        status: 400,
        body: { error: 'invalid-folder' }
      });
      expect(getSharedConfig).not.toHaveBeenCalled();
    }
  );

  test('applies the site’s transform before checking', async () => {
    const bypass = createNewPageHandler({
      mode: 'active',
      contentUrl: 'http://content',
      transformSharedConfig: config => ({ ...config, sourceCapabilities: { writable: true } })
    });
    expect((await check(bypass, '/test')).body).toEqual({ folder: '/test', writable: true });
  });

  test('reads a bounded number of folders for a very deep folder', async () => {
    const folder = `/${Array.from({ length: 500 }, () => 'a').join('/')}`;

    expect((await check(handler, folder)).body).toEqual({ folder, writable: false });
    expect(getSharedConfig).toHaveBeenCalledTimes(MAX_NEW_PAGE_CONFIG_LOOKUPS);
  });

  describe('with creation metadata', () => {
    test.each([true, false])("answers %s without reading any folder's config", async writable => {
      newPageWritable.mockResolvedValue(writable);

      expect((await check(handler, '/docs/release-notes/new')).body).toEqual({
        folder: '/docs/release-notes/new',
        writable
      });
      expect(newPageWritable).toHaveBeenCalledWith(
        '/docs/release-notes/new',
        'active',
        'http://content'
      );
      expect(getSharedConfig).not.toHaveBeenCalled();
    });

    test('applies the site’s transform to the answer', async () => {
      newPageWritable.mockResolvedValue(false);
      const transformSharedConfig = vi.fn(() => ({ sourceCapabilities: { writable: true } }));
      const bypass = createNewPageHandler({
        mode: 'active',
        contentUrl: 'http://content',
        transformSharedConfig
      });

      expect((await check(bypass, '/test')).body).toEqual({ folder: '/test', writable: true });
      expect(transformSharedConfig).toHaveBeenCalledWith({
        sourceCapabilities: { writable: false }
      });
      expect(getSharedConfig).not.toHaveBeenCalled();
    });
  });

  test('reports a content server failure', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    getSharedConfig.mockRejectedValue(new Error('boom'));

    expect(await check(handler, '/docs')).toMatchObject({
      status: 503,
      body: { error: 'content-unavailable' }
    });
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });
});
