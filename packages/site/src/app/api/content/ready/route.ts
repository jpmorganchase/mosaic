/**
 * Dev-only upstream readiness probe.
 *
 * The Mosaic CLI's FS server has a noticeable cold-start window
 * between "process started" and "first source emission is on the
 * volume". A page render that lands in that window sees either an
 * ECONNREFUSED or — once the Fastify listener is up but no source
 * worker has emitted yet — a plain HTTP 404 from the catch-all.
 * The route renders `notFound()`; the user sees a 404 page and is
 * stuck refreshing until the CLI catches up.
 *
 * This endpoint lets the not-found page's recovery client component
 * poll a *known-good* upstream signal (`sitemap.xml`) at a steady
 * cadence to decide when to call `router.refresh()`. We poll from
 * the Next.js server (not the browser) for two reasons:
 *
 *   1. CORS — the upstream Mosaic FS server doesn't speak CORS for
 *      browser origins, so direct fetches from the page would fail.
 *   2. Trust boundary — `MOSAIC_ACTIVE_MODE_URL` is a server-side
 *      secret (it may point at an internal host); we don't want to
 *      expose it to the client.
 *
 * Snapshot modes don't have a cold start (the bytes are on disk /
 * in S3 at boot time), so the endpoint reports `ready: true`
 * immediately in those modes — the polling client then refreshes
 * once and stops, which is also the right behaviour for a genuine
 * snapshot 404 (the page actually doesn't exist; a refresh won't
 * conjure it but is harmless).
 *
 * Production gating: dev-only by design — see the
 * `process.env.NODE_ENV` guard. The route still exists in prod
 * builds (so the import in `<NotFoundRecovery />` doesn't break the
 * Next.js NFT trace) but returns 404 so the client stops polling.
 */
import { resolveMosaicMode } from '@jpmorganchase/mosaic-site-middleware';

// Active-mode `fetch` calls below; readiness must reflect *now*, not
// any cached prior result.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPSTREAM_PROBE_TIMEOUT_MS = 2_000;

export async function GET(): Promise<Response> {
  if (process.env.NODE_ENV !== 'development') {
    // Stops the client poller on its next tick — see
    // `<NotFoundRecovery />` for the 404 handling.
    return new Response('Not found', { status: 404 });
  }

  const { mode, contentUrl } = resolveMosaicMode();

  // Snapshot modes are ready as soon as the Next.js server is up —
  // the bytes are either on local disk or pre-loaded into S3 long
  // before the request lands. Report ready immediately so the
  // recovery component triggers exactly one `router.refresh()` and
  // unmounts (snapshot 404s are real 404s; one refresh confirms it
  // and the page stays as-is).
  if (mode !== 'active') {
    return Response.json({ ready: true, mode });
  }

  if (!contentUrl) {
    // No upstream configured — nothing to wait for. Mirrors the
    // snapshot fast-path so the client stops polling.
    return Response.json({ ready: true, mode, reason: 'no-upstream-configured' });
  }

  // Probe the sitemap rather than a content URL: it's a single
  // small file the CLI publishes once the source workers have
  // emitted at least one route, which is exactly the signal we
  // want ("the CLI is past cold-start and serving content"). A
  // 200 here means any subsequent page fetch has a chance of
  // returning real MDX instead of a catch-all 404.
  //
  // `AbortController` cap: if the upstream is wedged (not just
  // slow) we don't want to hold the dev's browser poll open
  // indefinitely. 2s is generous for a localhost probe and short
  // enough that the next poll tick keeps the recovery loop
  // responsive.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(`${contentUrl}/sitemap.xml`, {
      cache: 'no-store',
      signal: controller.signal
    });
    // Treat any 2xx as ready. A 404 here means the CLI is up but
    // hasn't emitted yet — the exact state we're waiting to exit,
    // so report `ready: false` and let the client keep polling.
    return Response.json({ ready: response.ok, mode, status: response.status });
  } catch (err) {
    // ECONNREFUSED / ENOTFOUND / AbortError all collapse to "not
    // ready yet"; the client will poll again. We deliberately
    // don't surface the raw error to the browser — it's noisy
    // and dev tooling, not a user-facing diagnostic.
    return Response.json({
      ready: false,
      mode,
      reason: err instanceof Error ? err.name : 'unknown'
    });
  } finally {
    clearTimeout(timeout);
  }
}

