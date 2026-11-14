/**
 * Site search: `GET /api/search?q=…&namespace=…`.
 *
 * Searches `search-records.json` from the snapshot or the content server.
 * See `createSearchHandler` for the query parameters and the response.
 *
 * Static-export builds (`MOSAIC_OUTPUT=export`) replace this file with a
 * stub via `scripts/static-export-route-stubs.mjs`; they copy
 * `search-records.json` to `public/` to search in the browser instead.
 */
import { createSearchHandler } from '@jpmorganchase/mosaic-site-middleware';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = createSearchHandler();
