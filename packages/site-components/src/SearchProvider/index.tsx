'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import type { SearchResult } from '@jpmorganchase/mosaic-site-middleware/search';
import { createSearchClient, type SearchClientOptions } from './searchClient';

export type { SearchClientOptions, SearchQueryOptions } from './searchClient';

export interface SearchProviderProps extends SearchClientOptions {
  children: ReactNode;
  /** Hide search on sites that do not generate search records. */
  enabled?: boolean;
  /**
   * Prefer results from this namespace without excluding other namespaces.
   * When unset, `SearchInput` uses the first segment of the current URL,
   * which is how search records name their namespace.
   */
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
  const { limit = 6, sectionsPerResult = 3 } = queryOptions ?? {};
  const { groupBy, pageRank, synonyms } = mode === 'browser' ? indexOptions ?? {} : {};
  // Cache the data/index independently of the policies used by each query.
  const synonymsKey = JSON.stringify(synonyms ?? null);
  const client = useMemo(
    () =>
      createSearchClient({
        mode,
        endpoint,
        recordsUrl,
        indexOptions: { synonyms: JSON.parse(synonymsKey) ?? undefined }
      }),
    [mode, endpoint, recordsUrl, synonymsKey]
  );
  // Changed policies rerun an active query without discarding the cached index.
  const search = useCallback(
    (query: string, namespace?: string, signal?: AbortSignal) =>
      client(query, namespace, signal, { groupBy, pageRank, limit, sectionsPerResult }),
    [client, groupBy, pageRank, limit, sectionsPerResult]
  );
  const value = useMemo(() => ({ search, enabled, namespace }), [search, enabled, namespace]);
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export const useSearchContext = (): SearchContextValue => useContext(SearchContext);
