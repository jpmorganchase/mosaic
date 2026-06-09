/**
 * Unit tests for `getTagSuggestions` in `cachedLoaders.ts`.
 *
 * The loader translates the CLI's `/_mosaic_/tags/list` HTTP
 * contract (200 + JSON `string[]`) into the editor host's
 * `readonly string[]` prop. Coverage focuses on:
 *
 *   - happy path (parses the array, dedupes via `filter`)
 *   - snapshot-mode short-circuit (no fetch, returns `[]`)
 *   - fail-soft behaviour (network errors, non-OK status,
 *     malformed JSON) — all collapse to `[]` so a degraded
 *     upstream never blocks the editor mount.
 *
 * Caching layers (`cache()` + `unstable_cache`) are bypassed
 * via `MOSAIC_DISABLE_LOADER_CACHE=true` so the implementation
 * runs on every call — necessary because the per-render
 * `cache()` is identity-keyed and would otherwise memoise the
 * first fetch for the lifetime of the test process.
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

import { getTagSuggestions } from '../cachedLoaders.js';

const CONTENT_URL = 'http://content.test';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getTagSuggestions', () => {
  test('returns the JSON array from /_mosaic_/tags/list on 200', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(['blog', 'design-system', 'platform']), { status: 200 })
    );

    const result = await getTagSuggestions('active', CONTENT_URL);

    expect(result).toEqual(['blog', 'design-system', 'platform']);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(`${CONTENT_URL}/_mosaic_/tags/list`, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }
    });
  });

  test('filters non-string entries defensively', async () => {
    // The CLI endpoint returns `string[]`, but at the trust
    // boundary we should drop stray non-strings (e.g. someone
    // ships a buggy proxy that injects `null` placeholders)
    // rather than ship them downstream as ComboBox `Option`
    // values.
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(['blog', null, 42, 'platform']), { status: 200 })
    );

    const result = await getTagSuggestions('active', CONTENT_URL);

    expect(result).toEqual(['blog', 'platform']);
  });

  test('short-circuits to [] for snapshot-file without fetching', async () => {
    // Snapshots don't ship a tag enumeration endpoint. Returning
    // [] (rather than throwing) lets the host wire the provider
    // unconditionally — the editor gets a free-text fallback
    // with an empty dropdown in snapshot mode, typeahead in
    // active mode.
    const result = await getTagSuggestions('snapshot-file', CONTENT_URL);

    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('short-circuits to [] for snapshot-s3 without fetching', async () => {
    const result = await getTagSuggestions('snapshot-s3', CONTENT_URL);

    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('returns [] when contentUrl is empty (no upstream configured)', async () => {
    const result = await getTagSuggestions('active', '');

    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('returns [] (not throw) on a non-OK status', async () => {
    // Tag autocomplete is a quality-of-life feature, not a
    // correctness boundary. A 5xx from the CLI shouldn't tear
    // down the editor — the author should still be able to
    // open the Frontmatter tab and edit the page.
    fetchMock.mockResolvedValueOnce(new Response('Boom', { status: 500 }));

    const result = await getTagSuggestions('active', CONTENT_URL);

    expect(result).toEqual([]);
  });

  test('returns [] (not throw) when fetch rejects', async () => {
    // Cold-start: CLI process is up but the port isn't listening
    // yet, or the network blipped between processes. Same
    // fail-soft posture — degrade to no-suggestions.
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    // Silence the expected warning so the test output stays
    // clean.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await getTagSuggestions('active', CONTENT_URL);

    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test('returns [] when the upstream responds with a non-array JSON body', async () => {
    // Defensive: a buggy proxy or a future endpoint shape change
    // mustn't crash the editor mount. We treat anything that
    // isn't `string[]` as "no suggestions available".
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ tags: ['blog'] }), { status: 200 })
    );

    const result = await getTagSuggestions('active', CONTENT_URL);

    expect(result).toEqual([]);
  });
});
