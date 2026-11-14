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
import fs from 'fs';
import path from 'path';
import type { MosaicMode, SearchRecordsFile } from '@jpmorganchase/mosaic-types';

import { getSnapshotFileConfig } from './loaders/index.js';
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

interface RecordsSource {
  /** Changes when the records do. */
  version: string;
  /** Absent when the records haven't changed since `knownVersion`. */
  text?: string;
}

// FNV-1a: tells whether the active-mode records changed, without keeping a copy.
function hash(text: string) {
  let value = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 0x01000193);
  }
  return `${text.length}-${(value >>> 0).toString(36)}`;
}

async function readRecordsSource(
  mode: MosaicMode,
  contentUrl: string,
  knownVersion?: string
): Promise<RecordsSource | undefined> {
  if (mode === 'snapshot-file') {
    const { snapshotDir } = getSnapshotFileConfig(SEARCH_RECORDS_FILE);
    // Sites include their snapshots with `outputFileTracingIncludes`.
    const filePath = path.join(
      /*turbopackIgnore: true*/ process.cwd(),
      snapshotDir,
      SEARCH_RECORDS_FILE
    );
    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(filePath);
    } catch {
      return undefined;
    }
    const version = `${filePath}:${stat.mtimeMs}:${stat.size}`;
    if (version === knownVersion) {
      return { version };
    }
    return { version, text: await fs.promises.readFile(filePath, 'utf8') };
  }
  const response = await fetch(`${contentUrl}/${SEARCH_RECORDS_FILE}`, { cache: 'no-store' });
  if (response.status === 404) {
    return undefined;
  }
  if (!response.ok) {
    throw new Error(
      `Failed to load ${SEARCH_RECORDS_FILE} from ${contentUrl}: ${response.status} ${response.statusText}`
    );
  }
  const text = await response.text();
  return { version: hash(text), text };
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
  const source = await readRecordsSource(mode, contentUrl);
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

  let loaded: { version: string; index: MosaicSearchIndex; checkedAt: number } | undefined;
  let pending: Promise<typeof loaded> | undefined;

  const refresh = (mode: MosaicMode, contentUrl: string) => {
    pending ??= (async () => {
      const source = await readRecordsSource(mode, contentUrl, loaded?.version);
      if (!source) {
        loaded = undefined;
      } else if (source.version === loaded?.version || source.text === undefined) {
        loaded = loaded && { ...loaded, checkedAt: Date.now() };
      } else {
        const { records } = parseRecords(source.text);
        loaded = {
          version: source.version,
          index: createSearchIndex(records, indexOptions),
          checkedAt: Date.now()
        };
      }
      return loaded;
    })().finally(() => {
      pending = undefined;
    });
    return pending;
  };

  const getIndex = async (mode: MosaicMode, contentUrl: string) => {
    if (mode === 'snapshot-file' || !loaded) {
      return (await refresh(mode, contentUrl))?.index;
    }
    if (Date.now() - loaded.checkedAt >= maxAge) {
      refresh(mode, contentUrl).catch(error => {
        console.warn(`[Mosaic] Couldn't refresh the search records: ${error}`);
      });
    }
    return loaded.index;
  };

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
