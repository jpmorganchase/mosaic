/**
 * Dev-only in-process event bus for content-change notifications.
 *
 * `app/api/revalidate/route.ts` calls `notifyContentChanged()` after
 * `revalidateTag(...)` so any open `EventSource` connection on
 * `app/api/content/live/route.ts` can push a refresh signal to the
 * browser. The client `<LiveReload />` component then calls
 * `router.refresh()` to re-fetch the (now-stale) RSC payload.
 *
 * Stored on `globalThis` so it survives Next's module re-evaluation
 * across HMR cycles in `next dev`; without that, every code edit would
 * orphan all existing SSE subscribers.
 *
 * No-op design (singleton EventEmitter, in-memory only): this is dev
 * tooling. The production build still imports this module — calling
 * `notifyContentChanged()` is cheap and harmless when no SSE clients
 * are connected — but the SSE route and `<LiveReload />` itself are
 * dev-gated, so prod has zero subscribers and zero overhead.
 */
import { EventEmitter } from 'node:events';

const CONTENT_CHANGED = 'content-changed';

declare global {
  var __mosaicLiveReloadBus: EventEmitter | undefined;
}

function getBus(): EventEmitter {
  if (!globalThis.__mosaicLiveReloadBus) {
    const bus = new EventEmitter();
    // SSE route opens one listener per connected browser tab; raise
    // the cap so a dev with many tabs doesn't get spurious warnings.
    bus.setMaxListeners(100);
    globalThis.__mosaicLiveReloadBus = bus;
  }
  return globalThis.__mosaicLiveReloadBus;
}

export function notifyContentChanged(): void {
  getBus().emit(CONTENT_CHANGED);
}

export function subscribeContentChanged(handler: () => void): () => void {
  const bus = getBus();
  bus.on(CONTENT_CHANGED, handler);
  return () => {
    bus.off(CONTENT_CHANGED, handler);
  };
}
