import { EventEmitter } from 'node:events';

const CONTENT_CHANGED = 'content-changed';
declare global {
  var __mosaicLiveReloadBus: EventEmitter | undefined;
}

/** Node-only, process-local development notifications, retained across HMR. */
function getBus(): EventEmitter {
  if (!globalThis.__mosaicLiveReloadBus) {
    const bus = new EventEmitter();
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
