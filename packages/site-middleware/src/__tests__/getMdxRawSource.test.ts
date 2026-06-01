/**
 * Unit tests for `getMdxRawSource` in `cachedLoaders.ts`.
 *
 * The loader's whole job is to translate the Mosaic CLI's
 * `/_mosaic-raw/*` HTTP contract (status code + `X-Mosaic-Raw-*`
 * headers) into the discriminated `MdxRawSourceResult` the
 * editor consumes. Coverage focuses on that mapping plus the
 * snapshot-mode short-circuit; the network layer itself is a
 * standard `fetch` call so we don't have to test it.
 *
 * Caching layers (`cache()` + `unstable_cache`) are bypassed
 * via `MOSAIC_DISABLE_LOADER_CACHE=true` so the implementation
 * runs on every call — necessary for these tests because
 * vitest's module isolation already gives us a fresh cache per
 * file, but assertions about call counts would otherwise be
 * fragile if a future commit raises the cache lifetime.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Bypass both cache layers before importing the module under
// test (the `cacheDisabled` flag is captured at module-eval
// time). Setting in module scope rather than `beforeAll` so the
// env is in place by the time the `import` below resolves.
process.env.MOSAIC_DISABLE_LOADER_CACHE = 'true';

// `next/cache` isn't loadable outside a Next runtime — vitest's
// Node project can't resolve its conditional exports. We bypass
// it entirely because `MOSAIC_DISABLE_LOADER_CACHE=true` already
// short-circuits the cache wrapper before `unstable_cache` is
// ever called; the mock just satisfies the top-level import.
vi.mock('next/cache', () => ({
  unstable_cache: (impl: unknown) => impl
}));

import { getMdxRawSource } from '../cachedLoaders.js';

const CONTENT_URL = 'http://content.test';

function fetchResponse(
  status: number,
  body: string,
  headers: Record<string, string> = {}
): Response {
  return new Response(body, { status, headers });
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getMdxRawSource', () => {
  test('returns kind=raw + namespace + bytes on 200', async () => {
    fetchMock.mockResolvedValueOnce(
      fetchResponse(200, '---\ntitle: X\n---\n# Hi\n', {
        'x-mosaic-raw-namespace': 'mosaic'
      })
    );

    const result = await getMdxRawSource('/mosaic/index.mdx', 'active', CONTENT_URL);

    expect(result).toEqual({
      kind: 'raw',
      bytes: '---\ntitle: X\n---\n# Hi\n',
      namespace: 'mosaic'
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(`${CONTENT_URL}/_mosaic-raw/mosaic/index.mdx`);
  });

  test('normalises `/foo/index` to `/foo/index.mdx` before fetching', async () => {
    // Mirrors `getMdxRaw`'s `normalizeMdxUrl` behaviour so both
    // loaders address the upstream the same way for the same
    // route — keeps debugging "why does one work and the other
    // not" investigations short.
    fetchMock.mockResolvedValueOnce(
      fetchResponse(200, 'body', { 'x-mosaic-raw-namespace': 'mosaic' })
    );

    await getMdxRawSource('/mosaic/getting-started/index', 'active', CONTENT_URL);

    expect(fetchMock).toHaveBeenCalledWith(
      `${CONTENT_URL}/_mosaic-raw/mosaic/getting-started/index.mdx`
    );
  });

  test('maps 404 + X-Mosaic-Raw-Status=unsupported-source onto the typed result', async () => {
    fetchMock.mockResolvedValueOnce(
      fetchResponse(404, '', {
        'x-mosaic-raw-status': 'unsupported-source',
        'x-mosaic-raw-module': '@jpmorganchase/mosaic-source-git-repo'
      })
    );

    const result = await getMdxRawSource('/docs/page.mdx', 'active', CONTENT_URL);

    expect(result).toEqual({
      kind: 'unsupported-source',
      modulePath: '@jpmorganchase/mosaic-source-git-repo'
    });
  });

  test('maps 404 + X-Mosaic-Raw-Status=no-matching-source', async () => {
    fetchMock.mockResolvedValueOnce(
      fetchResponse(404, '', { 'x-mosaic-raw-status': 'no-matching-source' })
    );

    const result = await getMdxRawSource('/unknown/page.mdx', 'active', CONTENT_URL);

    expect(result).toEqual({ kind: 'no-matching-source' });
  });

  test('maps a bare 404 (no header) onto kind=not-found', async () => {
    fetchMock.mockResolvedValueOnce(fetchResponse(404, ''));

    const result = await getMdxRawSource('/mosaic/gone.mdx', 'active', CONTENT_URL);

    expect(result).toEqual({ kind: 'not-found' });
  });

  test('short-circuits to unavailable-in-mode for snapshot-file without fetching', async () => {
    const result = await getMdxRawSource('/mosaic/index.mdx', 'snapshot-file', CONTENT_URL);

    expect(result).toEqual({ kind: 'unavailable-in-mode', mode: 'snapshot-file' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('short-circuits to unavailable-in-mode for snapshot-s3 without fetching', async () => {
    const result = await getMdxRawSource('/mosaic/index.mdx', 'snapshot-s3', CONTENT_URL);

    expect(result).toEqual({ kind: 'unavailable-in-mode', mode: 'snapshot-s3' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('throws on a non-404 non-2xx so the caller sees real upstream errors', async () => {
    fetchMock.mockResolvedValueOnce(fetchResponse(500, ''));

    await expect(getMdxRawSource('/mosaic/index.mdx', 'active', CONTENT_URL)).rejects.toThrow(
      /Failed to load raw MDX/
    );
  });
});
