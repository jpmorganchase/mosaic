/**
 * Search API for App Router route handlers:
 *
 *   // app/api/search/route.ts
 *   export const GET = createSearchHandler();
 *
 * Reads `search-records.json` (written by `SearchIndexPlugin`) from the
 * snapshot or the active-mode content server, and keeps the built index in
 * memory. It doesn't use Next's data cache: the records of a large site are
 * over its 2 MB limit, and rebuilding the index on every request would be slow.
 *
 * Server-only. Browsers can search the records directly with
 * `@jpmorganchase/mosaic-site-middleware/search`.
 */
import type { MosaicMode, SearchRecordsFile } from '@jpmorganchase/mosaic-types';

import { createContentFileCache, readContentFile } from './contentFiles.js';
import { resolveMosaicMode } from './loadSitemap.js';
import {
  createSearchIndex,
  type MosaicSearchIndex,
  type SearchIndexOptions
} from './search/index.js';

export const SEARCH_RECORDS_FILE = 'search-records.json';

const MAX_QUERY_LENGTH = 200;
const MAX_SECTIONS = 10;

export interface SearchHandlerOptions extends SearchIndexOptions {
  /** Defaults to `MOSAIC_MODE`. */
  mode?: MosaicMode;
  /** Defaults to `MOSAIC_<MODE>_MODE_URL`. */
  contentUrl?: string;
  /**
   * Active mode: how long, in milliseconds, to search the records before
   * checking the content server for new ones. Until the check finishes,
   * searches use the records already loaded. Defaults to 30 seconds.
   * Snapshot mode checks the file's modification time on every search.
   */
  maxAge?: number;
  /** The most results a request can ask for with `limit`. Defaults to 50. */
  maxLimit?: number;
}

function parseRecords(text: string): SearchRecordsFile {
  const file = JSON.parse(text) as SearchRecordsFile;
  if (file?.version !== 1 || !Array.isArray(file.records)) {
    throw new Error(`Unsupported ${SEARCH_RECORDS_FILE} format`);
  }
  return file;
}

/**
 * Reads `search-records.json` from the snapshot or the content server.
 * Undefined when there isn't one, for example when `SearchIndexPlugin`'s
 * `records` option is `false`. Not cached.
 */
export async function loadSearchRecords(
  mode: MosaicMode = resolveMosaicMode().mode,
  contentUrl: string = resolveMosaicMode().contentUrl
): Promise<SearchRecordsFile | undefined> {
  const source = await readContentFile(SEARCH_RECORDS_FILE, mode, contentUrl);
  return source?.text === undefined ? undefined : parseRecords(source.text);
}

const toInteger = (value: string | null, fallback: number, min: number, max: number) => {
  const parsed = value === null ? NaN : Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : Math.min(max, Math.max(min, parsed));
};

/**
 * Creates a `GET` route handler that searches the site's records.
 *
 * Query parameters:
 *
 * - `q`: the query. Longer than 200 characters is cut.
 * - `namespace`: rank results in this namespace first.
 * - `namespaces`: only return results in these namespaces, comma-separated.
 * - `limit`: the most results, from 1 to `maxLimit`. Defaults to 10.
 * - `sections`: the most other matching sections per result, from 0 to 10. Defaults to 3.
 *
 * Responds with `{ query, results }`, where `results` are the index's
 * `SearchResult`s; 404 when the site has no search records; and 503 when
 * they can't be loaded.
 */
export function createSearchHandler(options: SearchHandlerOptions = {}) {
  const {
    mode: modeOption,
    contentUrl: contentUrlOption,
    maxAge = 30_000,
    maxLimit = 50
  } = options;
  const indexOptions: SearchIndexOptions = {
    synonyms: options.synonyms,
    groupBy: options.groupBy,
    pageRank: options.pageRank
  };

  const getIndex = createContentFileCache(
    SEARCH_RECORDS_FILE,
    text => createSearchIndex(parseRecords(text).records, indexOptions),
    { maxAge }
  );

  return async function GET(request: Request): Promise<Response> {
    const params = new URL(request.url).searchParams;
    const query = (params.get('q') ?? '').slice(0, MAX_QUERY_LENGTH);
    if (query.trim() === '') {
      return Response.json({ query, results: [] });
    }
    const resolved = resolveMosaicMode();
    const mode = modeOption ?? resolved.mode;
    const contentUrl = contentUrlOption ?? resolved.contentUrl;

    let index: MosaicSearchIndex | undefined;
    try {
      index = await getIndex(mode, contentUrl);
    } catch (error) {
      console.error(`[Mosaic] Couldn't load the search records: ${error}`);
      return Response.json({ error: 'search-unavailable' }, { status: 503 });
    }
    if (!index) {
      return Response.json({ error: 'search-records-not-found' }, { status: 404 });
    }

    const namespaces = params
      .getAll('namespaces')
      .flatMap(value => value.split(','))
      .map(value => value.trim())
      .filter(Boolean);
    const results = index.search(query, {
      namespace: params.get('namespace') || undefined,
      ...(namespaces.length > 0 ? { namespaces } : {}),
      limit: toInteger(params.get('limit'), 10, 1, maxLimit),
      sectionsPerResult: toInteger(params.get('sections'), 3, 0, MAX_SECTIONS)
    });
    return Response.json({ query, results });
  };
}
