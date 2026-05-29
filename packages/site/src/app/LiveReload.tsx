'use client';

/**
 * Dev-only browser auto-refresh on Mosaic content changes.
 *
 * Opens an `EventSource` against `/api/content/live` (a Server-Sent
 * Events stream). Whenever `app/api/revalidate/route.ts` invalidates
 * the content cache it emits an event on the in-process bus, the
 * stream pushes `event: content-changed` to every connected tab, and
 * this handler calls `router.refresh()` — which re-fetches the RSC
 * payload for the current route and the just-revalidated server
 * cache fills it with the new MDX. Net effect: edits to docs/*.mdx
 * appear in the browser ~1 s later with no manual reload.
 *
 * Rendering gate: the parent layout only renders this component when
 * `process.env.NODE_ENV === 'development'`. The SSE route applies the
 * same gate server-side as a defence in depth, so an accidental prod
 * render would just see a 404 and stop reconnecting.
 *
 * Reconnect strategy: `EventSource` already auto-reconnects on
 * transport-level drops with a server-controlled `retry:` interval
 * (defaults to ~3 s). We don't need our own backoff. If the dev
 * server is restarted, the browser will reconnect within a few
 * seconds without any code path here.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function LiveReload() {
  const router = useRouter();

  useEffect(() => {
    // `EventSource` is a no-op on the server; the `useEffect` guard
    // ensures we only run in the browser, but be defensive in case
    // someone renames this to a non-effect call later.
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      return undefined;
    }

    const source = new EventSource('/api/content/live');

    const handleChange = () => {
      // `router.refresh()` re-fetches the current route's RSC payload
      // from the server without losing client state (scroll position,
      // form input, etc.) — exactly the UX we want for a content
      // hot-reload.
      router.refresh();
    };

    source.addEventListener('content-changed', handleChange);

    return () => {
      source.removeEventListener('content-changed', handleChange);
      source.close();
    };
  }, [router]);

  return null;
}
