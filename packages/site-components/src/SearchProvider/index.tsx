'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createSearchClient, type SearchClientOptions } from './searchClient';

export interface SearchProviderProps extends SearchClientOptions {
  children: ReactNode;
  /** Hide search on sites that do not generate search records. */
  enabled?: boolean;
  /** Prefer results from this namespace without excluding other namespaces. */
  namespace?: string;
}

const SearchContext = createContext({
  search: createSearchClient(),
  enabled: true,
  namespace: undefined as string | undefined
});

export function SearchProvider({
  children,
  mode = 'server',
  endpoint = '/api/search',
  recordsUrl = '/search-records.json',
  enabled = true,
  namespace
}: SearchProviderProps) {
  const search = useMemo(
    () => createSearchClient({ mode, endpoint, recordsUrl }),
    [mode, endpoint, recordsUrl]
  );
  const value = useMemo(() => ({ search, enabled, namespace }), [search, enabled, namespace]);
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export const useSearchContext = () => useContext(SearchContext);
