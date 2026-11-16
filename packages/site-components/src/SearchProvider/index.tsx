'use client';

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { SearchResult } from '@jpmorganchase/mosaic-site-middleware/search';
import { createSearchClient, type SearchClientOptions } from './searchClient';

export type { SearchClientOptions, SearchQueryOptions } from './searchClient';

export interface SearchProviderProps extends SearchClientOptions {
  children: ReactNode;
  /** Hide search on sites that do not generate search records. */
  enabled?: boolean;
  /**
   * Prefer results from this namespace without excluding other namespaces.
   * Defaults to the first segment of the current URL, which is how search
   * records name their namespace.
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
  // Hosts often write index options inline. Changing them mustn't download
  // the records and rebuild the browser index again, so the client reads
  // `groupBy` and `pageRank` from a ref when it ranks results, and is only
  // recreated when the synonyms, which the index is built with, change.
  const latestIndexOptions = useRef(indexOptions);
  useEffect(() => {
    latestIndexOptions.current = indexOptions;
  });
  const synonymsKey = JSON.stringify(indexOptions?.synonyms ?? null);
  const hasGroupBy = typeof indexOptions?.groupBy === 'function';
  const hasPageRank = typeof indexOptions?.pageRank === 'function';
  const search = useMemo(
    () =>
      createSearchClient({
        mode,
        endpoint,
        recordsUrl,
        indexOptions: {
          synonyms: JSON.parse(synonymsKey) ?? undefined,
          groupBy: hasGroupBy ? record => latestIndexOptions.current!.groupBy!(record) : undefined,
          pageRank: hasPageRank
            ? record => latestIndexOptions.current!.pageRank!(record)
            : undefined
        },
        queryOptions: { limit, sectionsPerResult }
      }),
    [mode, endpoint, recordsUrl, synonymsKey, hasGroupBy, hasPageRank, limit, sectionsPerResult]
  );
  const pathname = usePathname();
  const currentNamespace = namespace ?? pathname?.split('/').find(Boolean);
  const value = useMemo(
    () => ({ search, enabled, namespace: currentNamespace }),
    [search, enabled, currentNamespace]
  );
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export const useSearchContext = (): SearchContextValue => useContext(SearchContext);
