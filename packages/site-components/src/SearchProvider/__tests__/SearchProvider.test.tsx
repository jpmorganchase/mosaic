import React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  createSearchIndex,
  type SearchIndexOptions
} from '@jpmorganchase/mosaic-site-middleware/search';
import { SearchProvider, useSearchContext, type SearchProviderProps } from '../index';

afterEach(() => vi.unstubAllGlobals());

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

  test('retains the existing defaults', async () => {
    const fetcher = vi.fn(async () => Response.json({ results: [] }));
    vi.stubGlobal('fetch', fetcher);
    await context({}).result.current.search('button');
    const url = fetcher.mock.calls[0][0] as unknown as URL;
    expect(url.searchParams.get('limit')).toBe('6');
    expect(url.searchParams.get('sections')).toBe('3');
  });
});
