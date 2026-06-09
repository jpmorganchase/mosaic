/**
 * Notifies a downstream Next.js site to revalidate its content cache
 * whenever a Mosaic source emits an update.
 *
 * Pairs with `packages/site/src/app/api/revalidate/route.ts` and the
 * tagged `cache()` + `unstable_cache()` layer in
 * `packages/site-middleware/src/cachedLoaders.ts`. The site keeps
 * cached snapshot reads valid indefinitely (no `revalidate` window) and
 * relies on this notifier to flush them when underlying content
 * changes — which means content updates propagate to the site without
 * a restart and without per-request round-trips.
 *
 * Configuration (env vars on the **CLI process**, not the site):
 *
 *   - `MOSAIC_REVALIDATE_URL`     — full URL of the site's revalidate
 *                                   endpoint, e.g.
 *                                   `http://localhost:3000/api/revalidate`.
 *   - `MOSAIC_REVALIDATE_SECRET`  — shared secret matching the value
 *                                   the site reads from its own env.
 *
 * Both must be set to enable notifications. If either is missing the
 * notifier is a no-op (logs once on startup so the operator knows)
 * — keeps backwards-compat with existing deployments that haven't
 * opted in.
 *
 * Debounce: source updates can fire in bursts (e.g. multiple sources
 * settle within a few hundred ms of each other on startup). The first
 * event in a burst fires immediately (leading edge) so a single save
 * isn't delayed; any further events arriving inside the
 * `DEBOUNCE_MS` window are coalesced into one trailing flush so the
 * site sees at most two cache flushes per burst regardless of N.
 */
import type MosaicCore from '@jpmorganchase/mosaic-core';

const DEBOUNCE_MS = 500;

interface Notifier {
  /** Stop watching for source updates. */
  stop(): void;
}

/**
 * Subscribe to source updates on a running Mosaic core and POST a
 * revalidation request to the configured site for each (debounced)
 * batch. Returns a handle so callers can detach on shutdown; the
 * notifier is otherwise self-contained.
 */
export function startRevalidateNotifier(mosaic: MosaicCore): Notifier {
  const url = process.env.MOSAIC_REVALIDATE_URL;
  const secret = process.env.MOSAIC_REVALIDATE_SECRET;

  if (!url || !secret) {
    console.log(
      '[Mosaic] Revalidate notifier disabled (set MOSAIC_REVALIDATE_URL and MOSAIC_REVALIDATE_SECRET to enable).'
    );
    return { stop() {} };
  }

  let timer: NodeJS.Timeout | undefined;
  let stopped = false;
  // True while we're inside the suppression window opened by a leading-edge
  // fire. Reset to false after `DEBOUNCE_MS` of idleness.
  let firedThisWindow = false;
  // Set when an event arrives during the suppression window; drives the
  // trailing flush so changes that landed inside the window aren't lost.
  let pendingTrailing = false;

  const fire = async () => {
    timer = undefined;
    if (stopped) return;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-mosaic-revalidate-secret': secret
        }
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        console.warn(
          `[Mosaic] Revalidate POST to ${url} returned ${response.status} ${
            response.statusText
          } ${body.slice(0, 200)}`
        );
        return;
      }
      console.log(`[Mosaic] Revalidated site cache at ${url}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[Mosaic] Revalidate POST to ${url} failed: ${message}`);
    }
  };

  const armResetTimer = () => {
    timer = setTimeout(() => {
      timer = undefined;
      // Suppression window closed. If anything arrived after the leading
      // fire, flush the coalesced trailing notification now — which itself
      // counts as the leading edge of a new window.
      const shouldTrailing = pendingTrailing;
      firedThisWindow = false;
      pendingTrailing = false;
      if (shouldTrailing) {
        firedThisWindow = true;
        void fire();
        armResetTimer();
      }
    }, DEBOUNCE_MS);
  };

  const schedule = () => {
    if (stopped) return;
    if (!firedThisWindow) {
      // Leading edge: fire immediately, open the suppression window.
      firedThisWindow = true;
      void fire();
      armResetTimer();
      return;
    }
    // Inside the window — coalesce into a single trailing flush.
    pendingTrailing = true;
  };

  mosaic.onSourceUpdate(schedule);
  console.log(`[Mosaic] Revalidate notifier active — will POST ${url} on source updates.`);

  return {
    stop() {
      stopped = true;
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    }
  };
}
