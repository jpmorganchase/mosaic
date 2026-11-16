import { subscribeContentChanged } from './liveReloadBus.js';

export interface LiveReloadHandlerOptions {
  /** Evaluate host policy for every connection. Only development should enable SSE. */
  isDevelopment: () => boolean;
  subscribe?: typeof subscribeContentChanged;
  keepaliveIntervalMs?: number;
}

/** Node route handler for the local development bus, with disconnect cleanup. */
export function createLiveReloadHandler({
  isDevelopment,
  subscribe = subscribeContentChanged,
  keepaliveIntervalMs = 15_000
}: LiveReloadHandlerOptions) {
  return async function GET(request: Request): Promise<Response> {
    if (!isDevelopment()) return new Response('Not found', { status: 404 });
    const encoder = new TextEncoder();
    let closed = false;
    let unsubscribe: (() => void) | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    let controller: ReadableStreamDefaultController<Uint8Array>;
    const teardown = () => {
      if (closed) return;
      closed = true;
      if (timer !== undefined) clearInterval(timer);
      unsubscribe?.();
      request.signal.removeEventListener('abort', teardown);
      try {
        controller.close();
      } catch {
        /* Already cancelled/closed. */
      }
    };
    const stream = new ReadableStream<Uint8Array>({
      start(streamController) {
        controller = streamController;
        if (request.signal.aborted) {
          teardown();
          return;
        }
        request.signal.addEventListener('abort', teardown, { once: true });
        const send = (payload: string) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(payload));
          } catch {
            teardown();
          }
        };
        send(': mosaic-live-reload connected\n\n');
        if (closed) return;
        const stop = subscribe(() => send('event: content-changed\ndata: 1\n\n'));
        // A custom subscriber can synchronously close/abort during registration.
        if (closed) {
          stop();
          return;
        }
        unsubscribe = stop;
        timer = setInterval(() => send(': keepalive\n\n'), keepaliveIntervalMs);
      },
      cancel: teardown
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    });
  };
}
