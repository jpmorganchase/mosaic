/**
 * Cache-revalidation webhook.
 *
 * `cachedLoaders.ts` tags every entry with `MOSAIC_CONTENT_CACHE_TAG`
 * (`'mosaic-content'`). This endpoint flips them all stale, so the
 * next page render re-reads from the snapshot or upstream.
 *
 * Typical wiring: the Mosaic CLI (`@jpmorganchase/mosaic-cli`) POSTs
 * here after it finishes writing a new snapshot to disk / S3. In
 * production deployments any CMS webhook can do the same.
 *
 * Security: the endpoint requires a shared secret in
 * `x-mosaic-revalidate-secret` (or `Authorization: Bearer <secret>`)
 * that matches `MOSAIC_REVALIDATE_SECRET`. If the env var is unset
 * the endpoint refuses to act — fail closed, never silently allow
 * unauthenticated cache busts.
 *
 * Static-export builds (`MOSAIC_OUTPUT=export`) replace this file
 * with a stub via `scripts/static-export-route-stubs.mjs`.
 */
import { revalidateTag } from 'next/cache';
import type { NextRequest } from 'next/server';
// Import from the narrow `/cache-tags` subpath rather than the
// package root. The barrel re-exports `cachedLoaders.ts`, which uses
// dynamic `process.cwd()` filesystem calls and the S3 SDK; pulling
// that file into this route's Next.js NFT trace caused Turbopack to
// warn that "the whole project was traced unintentionally" on build.
// This route only needs the cache-tag string constant.
import { MOSAIC_CONTENT_CACHE_TAG } from '@jpmorganchase/mosaic-site-middleware/cache-tags';

import { notifyContentChanged } from '../../../lib/liveReloadBus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function extractSecret(req: NextRequest): string | null {
  const header = req.headers.get('x-mosaic-revalidate-secret');
  if (header) return header;
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice('Bearer '.length);
  return null;
}

export async function POST(req: NextRequest) {
  const configured = process.env.MOSAIC_REVALIDATE_SECRET;
  if (!configured) {
    return Response.json(
      { ok: false, error: 'MOSAIC_REVALIDATE_SECRET is not configured on the server.' },
      { status: 503 }
    );
  }
  const provided = extractSecret(req);
  if (!provided || provided !== configured) {
    return Response.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  // Next 16 requires a cache-life profile alongside the tag. `'max'`
  // matches the default fetch-cache behaviour ("cache until invalidated").
  revalidateTag(MOSAIC_CONTENT_CACHE_TAG, 'max');

  // Dev-only browser auto-refresh: push a signal to any open
  // `<LiveReload />` `EventSource` so the page calls `router.refresh()`
  // without the user having to hit reload. Harmless in prod (no
  // subscribers).
  notifyContentChanged();

  return Response.json({
    ok: true,
    tag: MOSAIC_CONTENT_CACHE_TAG,
    revalidatedAt: new Date().toISOString()
  });
}
