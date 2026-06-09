/**
 * Dev-only Server-Sent Events stream for content auto-refresh.
 *
 * The client `<LiveReload />` component opens an `EventSource` here
 * on mount. Whenever `app/api/revalidate/route.ts` finishes
 * invalidating the content cache it calls `notifyContentChanged()`
 * which fires every subscriber registered through `liveReloadBus.ts`;
 * the handler installed below writes a `data: changed` SSE message to
 * each connected client, and the browser responds by calling
 * `router.refresh()`.
 *
 * Production gating: this endpoint refuses to serve a stream unless
 * `NODE_ENV === 'development'`. In prod the route still exists (so the
 * App Router doesn't choke on a missing module imported from
 * `<LiveReload />`'s SSR pass) but returns 404 immediately.
 *
 * Stream lifecycle: the SSE body is a `ReadableStream` whose `cancel`
 * handler tears down the bus subscription so closed tabs don't leak
 * listeners. A 15-second keep-alive `:` comment is also sent so
 * intermediate proxies (rare in dev, but the timer is free) don't
 * idle-close the connection.
 */
import { subscribeContentChanged } from '../../../../lib/liveReloadBus';

// SSE is inherently streaming: must run on the Node runtime, not the
// edge, and must never be cached / statically rendered.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const KEEPALIVE_INTERVAL_MS = 15_000;

export async function GET(): Promise<Response> {
  if (process.env.NODE_ENV !== 'development') {
    return new Response('Not found', { status: 404 });
  }

  const encoder = new TextEncoder();
  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (payload: string) => {
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Controller already closed (client disconnected between
          // the bus emit and our enqueue) — `cancel` will run next.
        }
      };

      // Initial comment flushes headers and confirms the stream is open.
      send(': mosaic-live-reload connected\n\n');

      const unsubscribe = subscribeContentChanged(() => {
        send('event: content-changed\ndata: 1\n\n');
      });

      const keepalive = setInterval(() => {
        send(': keepalive\n\n');
      }, KEEPALIVE_INTERVAL_MS);

      cleanup = () => {
        clearInterval(keepalive);
        unsubscribe();
      };
    },
    cancel() {
      cleanup?.();
      cleanup = undefined;
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Disable Next/Nginx buffering so events flush immediately.
      'X-Accel-Buffering': 'no'
    }
  });
}
