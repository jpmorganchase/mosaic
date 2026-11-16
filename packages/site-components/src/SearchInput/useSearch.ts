import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { SearchResult } from '@jpmorganchase/mosaic-site-middleware/search';
import { useSearchContext } from '../SearchProvider';

export function useSearch(query: string) {
  const context = useSearchContext();
  const { search, enabled } = context;
  // Search records name their namespace after the first URL segment.
  const pathname = usePathname();
  const namespace = context.namespace ?? pathname?.split('/').find(Boolean);
  const normalizedQuery = query.trim().slice(0, 200);
  const [response, setResponse] = useState<{
    query: string;
    namespace?: string;
    search: typeof search;
    results: SearchResult[];
    error: boolean;
  }>();

  useEffect(() => {
    if (!enabled || !normalizedQuery) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void search(normalizedQuery, namespace, controller.signal).then(
        results => {
          if (!controller.signal.aborted) {
            setResponse({ query: normalizedQuery, namespace, search, results, error: false });
          }
        },
        () => {
          if (!controller.signal.aborted) {
            setResponse({ query: normalizedQuery, namespace, search, results: [], error: true });
          }
        }
      );
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, normalizedQuery, namespace, search]);

  const current =
    enabled &&
    normalizedQuery &&
    response?.query === normalizedQuery &&
    response.namespace === namespace &&
    response.search === search
      ? response
      : undefined;
  return {
    enabled,
    results: current?.results ?? [],
    error: current?.error ?? false,
    loading: enabled && normalizedQuery.length > 0 && current === undefined
  };
}
