import React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  createSearchIndex,
  type SearchIndexOptions
} from '@jpmorganchase/mosaic-site-middleware/search';
import { SearchProvider, useSearchContext, type SearchProviderProps } from '../index';

vi.mock('@jpmorganchase/mosaic-site-middleware/search', async importOriginal => {
  const actual = await importOriginal<
    typeof import('@jpmorganchase/mosaic-site-middleware/search')
  >();
  return { ...actual, createSearchIndex: vi.fn(actual.createSearchIndex) };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const records = Array.from({ length: 24 }, (_, i) =>
  ['examples', 'usage'].map(tab => ({
    id: `/salt/component-${i}/${tab}`,
    route: `/salt/component-${i}/${tab}`,
    title: `Component ${i}`,
    text: 'Choose a color',
    headings: [],
    namespace: 'salt'
  }))
).flat();
const indexOptions: SearchIndexOptions = {
  synonyms: [['color', 'colour']],
  groupBy: record => record.route.slice(0, record.route.lastIndexOf('/')),
  pageRank: record => (record.route.endsWith('/usage') ? 0 : 1)
};

function context(options: Omit<SearchProviderProps, 'children'>) {
  return renderHook(() => useSearchContext(), {
    wrapper: ({ children }) => <SearchProvider {...options}>{children}</SearchProvider>
  });
}

/** Renders the provider with options computed on every render, as inline JSX props are. */
function inlineContext(options: () => Omit<SearchProviderProps, 'children'>) {
  return renderHook(() => useSearchContext(), {
    wrapper: ({ children }) => <SearchProvider {...options()}>{children}</SearchProvider>
  });
}

describe('SearchProvider configuration', () => {
  test('matches the direct browser engine with grouping, ranking, synonyms and query limits', async () => {
    const fetcher = vi.fn(async () => Response.json({ version: 1, records }));
    vi.stubGlobal('fetch', fetcher);
    const queryOptions = { limit: 20, sectionsPerResult: 0 };
    const { result, rerender } = context({ mode: 'browser', indexOptions, queryOptions });
    const search = result.current.search;
    const actual = await search('colour', 'salt');
    expect(actual).toEqual(
      createSearchIndex(records, indexOptions).search('colour', {
        ...queryOptions,
        namespace: 'salt'
      })
    );
    expect(actual).toHaveLength(20);
    expect(actual.every(hit => hit.href.endsWith('/usage') && hit.sections.length === 0)).toBe(
      true
    );
    rerender();
    expect(result.current.search).toBe(search);
    await result.current.search('color');
    expect(fetcher).toHaveBeenCalledOnce();
  });

  test('sends configured scalar limits to server search, retaining endpoint parameters', async () => {
    const fetcher = vi.fn(async () => Response.json({ results: [] }));
    vi.stubGlobal('fetch', fetcher);
    const { result } = context({
      endpoint: '/custom/search?scope=salt',
      queryOptions: { limit: 20, sectionsPerResult: 0 },
      // Callback policies belong on the server's handler; none are serialized in a request.
      indexOptions
    });
    await result.current.search('colour', 'salt');
    const url = fetcher.mock.calls[0][0] as unknown as URL;
    expect(Object.fromEntries(url.searchParams)).toEqual({
      scope: 'salt',
      q: 'colour',
      limit: '20',
      sections: '0',
      namespace: 'salt'
    });
  });

  test('ignores changing browser policies in server mode', async () => {
    const { result, rerender } = inlineContext(() => ({
      mode: 'server',
      indexOptions: {
        groupBy: record => record.route,
        pageRank: () => 0,
        synonyms: [['color', 'colour']]
      }
    }));
    const search = result.current.search;
    rerender();
    expect(result.current.search).toBe(search);
  });

  test('keeps one browser index when index options are written inline', async () => {
    const fetcher = vi.fn(async () => Response.json({ version: 1, records }));
    vi.stubGlobal('fetch', fetcher);
    let preferred = '/usage';
    const { result, rerender } = inlineContext(() => {
      // Each render makes new functions, each with the suffix of its own render.
      const suffix = preferred;
      return {
        mode: 'browser',
        indexOptions: {
          synonyms: [['color', 'colour']],
          groupBy: record => record.route.slice(0, record.route.lastIndexOf('/')),
          pageRank: record => (record.route.endsWith(suffix) ? 0 : 1)
        },
        queryOptions: { limit: 1, sectionsPerResult: 0 }
      };
    });
    const search = result.current.search;
    expect((await search('colour', 'salt'))[0].href).toMatch(/\/usage$/);

    preferred = '/examples';
    rerender();
    // The latest ranking applies without downloading the records again.
    expect((await result.current.search('colour', 'salt'))[0].href).toMatch(/\/examples$/);
    expect((await search('colour', 'salt'))[0].href).toMatch(/\/usage$/);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(createSearchIndex).toHaveBeenCalledOnce();
  });

  test.each(['removed', 'replaced'])(
    'keeps pending searches valid when callbacks are %s',
    async change => {
      let release!: (response: Response) => void;
      const fetcher = vi.fn(
        () =>
          new Promise<Response>(resolve => {
            release = resolve;
          })
      );
      vi.stubGlobal('fetch', fetcher);
      let policies: SearchIndexOptions | undefined = {
        groupBy: indexOptions.groupBy,
        pageRank: indexOptions.pageRank
      };
      const queryOptions = { limit: 50, sectionsPerResult: 0 };
      const { result, rerender } = inlineContext(() => ({
        mode: 'browser',
        indexOptions: policies,
        queryOptions
      }));
      const pending = result.current.search('color');
      policies =
        change === 'removed'
          ? undefined
          : {
              groupBy: () => 'all',
              pageRank: record => (record.route.endsWith('/examples') ? 0 : 1)
            };
      rerender();
      const next = result.current.search('color');
      release(Response.json({ version: 1, records }));

      const original = await pending;
      expect(original).toHaveLength(24);
      expect(original.every(hit => hit.href.endsWith('/usage'))).toBe(true);
      expect(await next).toEqual(
        createSearchIndex(records, policies).search('color', queryOptions)
      );
      expect(fetcher).toHaveBeenCalledOnce();
    }
  );

  test('changes query limits without downloading or rebuilding the browser index', async () => {
    const fetcher = vi.fn(async () => Response.json({ version: 1, records }));
    vi.stubGlobal('fetch', fetcher);
    let limit = 1;
    const { result, rerender } = inlineContext(() => ({
      mode: 'browser',
      queryOptions: { limit }
    }));
    expect(await result.current.search('color')).toHaveLength(1);
    limit = 4;
    rerender();
    expect(await result.current.search('color')).toHaveLength(4);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(createSearchIndex).toHaveBeenCalledOnce();
  });

  test('builds a new browser index when the synonyms change', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ version: 1, records }))
    );
    let synonyms = [['color', 'colour']];
    const { result, rerender } = inlineContext(() => ({
      mode: 'browser',
      indexOptions: { synonyms: synonyms.map(group => [...group]) }
    }));
    const search = result.current.search;
    rerender();
    expect(result.current.search).toBe(search);
    synonyms = [['color', 'hue']];
    rerender();
    expect(result.current.search).not.toBe(search);
    expect(await result.current.search('hue')).not.toEqual([]);
  });

  test('retains the existing defaults', async () => {
    const fetcher = vi.fn(async () => Response.json({ results: [] }));
    vi.stubGlobal('fetch', fetcher);
    await context({}).result.current.search('button');
    const url = fetcher.mock.calls[0][0] as unknown as URL;
    expect(url.searchParams.get('limit')).toBe('6');
    expect(url.searchParams.get('sections')).toBe('3');
  });
});
