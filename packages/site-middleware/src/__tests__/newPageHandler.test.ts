import { beforeEach, describe, expect, test, vi } from 'vitest';

const getSharedConfig = vi.fn();
vi.mock('../cachedLoaders.js', () => ({ getMdxRaw: vi.fn(), getSharedConfig }));
vi.mock('../newPageSources.js', () => ({ newPageWritable: async () => undefined }));
vi.mock('react', async () => ({
  ...(await vi.importActual<typeof import('react')>('react')),
  cache: <T>(fn: T) => fn
}));

const { createNewPageHandler } = await import('../newPageHandler.js');

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
