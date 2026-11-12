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
 * Configuration (env vars on the **CLI process**, not the site, checked
 * by `validateServeEnv()` in `env.ts`):
 *
 *   - `MOSAIC_REVALIDATE_URL`     — full URL of the site's revalidate
 *                                   endpoint, e.g.
 *                                   `http://localhost:3000/api/revalidate`.
 *   - `MOSAIC_REVALIDATE_SECRET`  — shared secret matching the value
 *                                   the site reads from its own env.
 *
 * Set both to enable notifications; `mosaic serve` refuses to start when
 * the URL is set without a secret. Without the URL, the notifier is a
 * no-op (logs once on startup so the operator knows).
 *
 * Debounce: source updates can fire in bursts (e.g. multiple sources
 * settle within a few hundred ms of each other on startup). The first
 * event in a burst fires immediately (leading edge) so a single save
 * isn't delayed; any further events arriving inside the
 * `DEBOUNCE_MS` window are coalesced into one trailing flush so the
 * site sees at most two cache flushes per burst regardless of N. Failed
 * deliveries stay pending and retry with bounded backoff; requests have a
 * ten-second deadline and only one request may be active at a time.
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
export function startRevalidateNotifier(
  mosaic: MosaicCore,
  target: { url: string; secret: string } | undefined
): Notifier {
  if (!target) {
    console.log(
      '[Mosaic] Revalidate notifier disabled (set MOSAIC_REVALIDATE_URL and MOSAIC_REVALIDATE_SECRET to enable).'
    );
    return { stop() {} };
  }
  const { url, secret } = target;

  let timer: NodeJS.Timeout | undefined;
  let deadline: NodeJS.Timeout | undefined;
  let controller: AbortController | undefined;
  let stopped = false;
  let inFlight = false;
  let generation = 0;
  let acknowledged = 0;
  let lastStarted = -Infinity;
  let retryDelay = 1000;

  const arm = (delay: number) => {
    timer = setTimeout(() => {
      timer = undefined;
      void fire();
    }, delay);
  };

  const fire = async () => {
    if (stopped || inFlight || acknowledged === generation) return;
    inFlight = true;
    lastStarted = Date.now();
    const sending = generation;
    controller = new AbortController();
    try {
      const timeout = new Promise<never>((_resolve, reject) => {
        deadline = setTimeout(() => {
          controller?.abort();
          reject(new Error('request timed out'));
        }, 10_000);
      });
      const response = await Promise.race([
        fetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-mosaic-revalidate-secret': secret
          },
          signal: controller.signal
        }),
        timeout
      ]);
      // No response payload is needed, including on failure.
      void response.body?.cancel().catch(() => {});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      acknowledged = sending;
      retryDelay = 1000;
      console.log(`[Mosaic] Revalidated site cache at ${url}`);
    } catch (error) {
      if (!stopped) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[Mosaic] Revalidate POST to ${url} failed: ${message}; retrying.`);
        arm(retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30_000);
      }
    } finally {
      if (deadline) clearTimeout(deadline);
      deadline = undefined;
      controller = undefined;
      inFlight = false;
      // Updates received during the request belong to a newer generation;
      // acknowledging the sent generation must not discard them.
      if (!stopped && !timer && acknowledged !== generation) {
        arm(Math.max(0, DEBOUNCE_MS - (Date.now() - lastStarted)));
      }
    }
  };

  const schedule = () => {
    if (stopped) return;
    generation++;
    if (inFlight || timer) return;
    const delay = DEBOUNCE_MS - (Date.now() - lastStarted);
    if (delay > 0) arm(delay);
    else void fire();
  };

  mosaic.onSourceUpdate(schedule);
  console.log(`[Mosaic] Revalidate notifier active — will POST ${url} on source updates.`);

  return {
    stop() {
      stopped = true;
      controller?.abort();
      if (deadline) clearTimeout(deadline);
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    }
  };
}
