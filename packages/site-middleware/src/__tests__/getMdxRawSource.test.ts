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
 * Outside a React server render each call represents a fresh request.
 * The persistent cache mock lets us check recovery when active-mode
 * caching is enabled for other content reads.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createHash } from 'node:crypto';

vi.mock('next/cache', () => ({
  unstable_cache: (impl: (...args: unknown[]) => Promise<unknown>) => {
    const entries = new Map<string, Promise<unknown>>();
    return (...args: unknown[]) => {
      const key = JSON.stringify(args);
      if (!entries.has(key)) entries.set(key, impl(...args));
      return entries.get(key);
    };
  }
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
  vi.unstubAllEnvs();
});

describe('getMdxRawSource', () => {
  test('returns the decoded source and a hash of the original bytes on 200', async () => {
    const bytes = '---\ntitle: Café\r\n---\n# Hi\n';
    const raw = `\uFEFF${bytes}`;
    fetchMock.mockResolvedValueOnce(
      fetchResponse(200, raw, {
        'x-mosaic-raw-namespace': 'mosaic'
      })
    );

    const result = await getMdxRawSource('/mosaic/index.mdx', 'active', CONTENT_URL);

    expect(result).toEqual({
      kind: 'raw',
      bytes,
      namespace: 'mosaic',
      sourceHash: createHash('sha256').update(raw).digest('hex')
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(`${CONTENT_URL}/_mosaic-raw/mosaic/index.mdx`, {
      cache: 'no-store'
    });
  });

  test('reads changed authored bytes when reopening with active-mode caching enabled', async () => {
    vi.stubEnv('MOSAIC_ACTIVE_MODE_CACHE', 'true');
    vi.stubEnv('MOSAIC_DISABLE_LOADER_CACHE', 'false');
    vi.resetModules();
    const freshModule = await import('../cachedLoaders.js');
    fetchMock
      .mockResolvedValueOnce(fetchResponse(200, 'before'))
      .mockResolvedValueOnce(fetchResponse(200, 'after'));

    for (const bytes of ['before', 'after']) {
      expect(
        await freshModule.getMdxRawSource('/docs/page.mdx', 'active', CONTENT_URL)
      ).toMatchObject({
        kind: 'raw',
        bytes,
        sourceHash: createHash('sha256').update(bytes).digest('hex')
      });
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
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
      `${CONTENT_URL}/_mosaic-raw/mosaic/getting-started/index.mdx`,
      { cache: 'no-store' }
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

  test('throws on a non-404 non-2xx so the caller sees real upstream errors', async () => {
    fetchMock.mockResolvedValueOnce(fetchResponse(500, ''));

    await expect(getMdxRawSource('/mosaic/index.mdx', 'active', CONTENT_URL)).rejects.toThrow(
      /Failed to load raw MDX/
    );
  });
});
