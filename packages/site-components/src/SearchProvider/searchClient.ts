import type {
  MosaicSearchIndex,
  SearchIndexOptions,
  SearchOptions,
  SearchResult
} from '@jpmorganchase/mosaic-site-middleware/search';

// Results navigate within the documentation site. Never pass a protocol URL
// supplied by content or a custom search endpoint to router.push().
const isInternalHref = (href: unknown): href is string =>
  typeof href === 'string' &&
  href.startsWith('/') &&
  !href.startsWith('//') &&
  !href.includes('\\') &&
  Array.from(href).every(character => character.charCodeAt(0) >= 32);

function internalResults(results: SearchResult[]): SearchResult[] {
  return results
    .filter(result => isInternalHref(result?.href))
    .map(result => ({
      ...result,
      sections: result.sections.filter(section => isInternalHref(section?.href))
    }));
}

export type SearchQueryOptions = Pick<SearchOptions, 'limit' | 'sectionsPerResult'>;

export type SearchClient = (
  query: string,
  namespace?: string,
  signal?: AbortSignal
) => Promise<SearchResult[]>;

export interface SearchClientOptions {
  /** Server search by default; static exports search downloaded records in the browser. */
  mode?: 'server' | 'browser';
  endpoint?: string;
  recordsUrl?: string;
  /** Browser index policies. In server mode, configure these on createSearchHandler. */
  indexOptions?: SearchIndexOptions;
  /** Applied in both modes. Defaults to six results and three additional sections. */
  queryOptions?: SearchQueryOptions;
}

export function createSearchClient({
  mode = 'server',
  endpoint = '/api/search',
  recordsUrl = '/search-records.json',
  indexOptions,
  queryOptions: { limit = 6, sectionsPerResult = 3 } = {}
}: SearchClientOptions = {}): SearchClient {
  let index: Promise<MosaicSearchIndex> | undefined;

  const loadIndex = () => {
    index ??= Promise.all([
      import('@jpmorganchase/mosaic-site-middleware/search'),
      fetch(recordsUrl).then(async response => {
        if (!response.ok) throw new Error('Search is unavailable');
        const file = await response.json();
        if (file?.version !== 1 || !Array.isArray(file.records)) {
          throw new Error('Invalid search records');
        }
        return file.records;
      })
    ])
      .then(([{ createSearchIndex }, records]) => createSearchIndex(records, indexOptions))
      .catch(error => {
        index = undefined;
        throw error;
      });
    return index;
  };

  return async (
    query: string,
    namespace?: string,
    signal?: AbortSignal
  ): Promise<SearchResult[]> => {
    const normalizedQuery = query.trim().slice(0, 200);
    if (!normalizedQuery) return [];
    if (mode === 'browser') {
      // A shared index load must survive one query being cancelled by the next.
      const loaded = await loadIndex();
      signal?.throwIfAborted();
      return internalResults(
        loaded.search(normalizedQuery, { namespace, limit, sectionsPerResult })
      );
    }
    const url = new URL(endpoint, window.location.href);
    url.searchParams.set('q', normalizedQuery);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('sections', String(sectionsPerResult));
    if (namespace) url.searchParams.set('namespace', namespace);
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error('Search is unavailable');
    const data = await response.json();
    if (!Array.isArray(data?.results)) throw new Error('Invalid search results');
    return internalResults(data.results);
  };
}
