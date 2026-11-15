'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { SearchResult } from '@jpmorganchase/mosaic-site-middleware/search';
import { createSearchClient, type SearchClientOptions } from './searchClient';

export type { SearchClientOptions, SearchQueryOptions } from './searchClient';

export interface SearchProviderProps extends SearchClientOptions {
  children: ReactNode;
  /** Hide search on sites that do not generate search records. */
  enabled?: boolean;
  /** Prefer results from this namespace without excluding other namespaces. */
  namespace?: string;
}

export interface SearchContextValue {
  search(query: string, namespace?: string, signal?: AbortSignal): Promise<SearchResult[]>;
  enabled: boolean;
  namespace?: string;
}

const SearchContext = createContext<SearchContextValue>({
  search: createSearchClient(),
  enabled: true,
  namespace: undefined
});

export function SearchProvider({
  children,
  mode = 'server',
  endpoint = '/api/search',
  recordsUrl = '/search-records.json',
  indexOptions,
  queryOptions,
  enabled = true,
  namespace
}: SearchProviderProps) {
  const { groupBy, pageRank, synonyms } = indexOptions ?? {};
  const { limit = 6, sectionsPerResult = 3 } = queryOptions ?? {};
  const search = useMemo(
    () =>
      createSearchClient({
        mode,
        endpoint,
        recordsUrl,
        indexOptions: { groupBy, pageRank, synonyms },
        queryOptions: { limit, sectionsPerResult }
      }),
    [mode, endpoint, recordsUrl, groupBy, pageRank, synonyms, limit, sectionsPerResult]
  );
  const value = useMemo(() => ({ search, enabled, namespace }), [search, enabled, namespace]);
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export const useSearchContext = (): SearchContextValue => useContext(SearchContext);
