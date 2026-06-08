'use client';

/**
 * Dev-only auto-recovery from cold-start 404s.
 *
 * The Mosaic CLI's FS server has a startup window between "process
 * started" and "first source emission is on the volume". A page
 * load that lands in that window renders the global not-found page
 * (the catch-all route resolves `mdx.kind === 'not-found'` and
 * calls `notFound()`). Before this component existed the user had
 * to keep hitting reload until the CLI caught up — and because
 * Next.js memoises the not-found render, a plain reload often
 * served the cached 404 anyway, forcing a hard refresh.
 *
 * This component:
 *
 *   1. Polls `/api/content/ready` on a fixed cadence. The endpoint
 *      probes the upstream and returns `{ ready: true }` once it
 *      responds with a 2xx.
 *   2. As soon as the upstream is ready, calls `router.refresh()`
 *      to re-fetch the current route's RSC payload. The page
 *      loader runs again, finds the now-served MDX, and renders
 *      it — replacing the not-found chrome in-place with no
 *      manual refresh.
 *   3. Renders a discreet inline hint so the user knows we're
 *      waiting on the CLI instead of leaving them staring at a
 *      static 404. The text is dev-only — production builds gate
 *      this whole component out at the call site.
 *
 * Snapshot modes: the `/api/content/ready` endpoint short-circuits
 * to `ready: true` in snapshot modes, so one poll triggers a
 * single refresh and the recovery unmounts. That's the right
 * outcome — snapshot 404s are real 404s, and one extra refresh
 * confirms the page genuinely doesn't exist.
 *
 * Endpoint disappeared (e.g. user hit a prod build): the route
 * returns 404, the poller treats that as terminal and stops. No
 * runaway loops.
 *
 * The polling cadence is deliberately fixed at 1.5 s rather than
 * an exponential backoff. The upstream is on the same host (dev
 * loopback) and the probe is cheap; biasing for *latency* of
 * recovery matters more than minimising request count.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const POLL_INTERVAL_MS = 1_500;

type ReadyResponse = { ready: boolean; mode?: string; reason?: string; status?: number };

export function NotFoundRecovery() {
  const router = useRouter();
  // `status` tells the user (and developers in screen recordings)
  // what we're doing. Three states:
  //   - `polling`: actively checking; render the waiting hint.
  //   - `refreshing`: upstream became ready, we've fired
  //     `router.refresh()` and are waiting for the new RSC payload
  //     to swap us out. Render a brief "refreshing" hint so the
  //     transition isn't jarring.
  //   - `stopped`: terminal state (endpoint gone / disabled / not
  //     in dev). Render nothing — fall back to the static 404.
  const [status, setStatus] = useState<'polling' | 'refreshing' | 'stopped'>('polling');

  useEffect(() => {
    // Server-side render is a no-op: `useEffect` doesn't run in SSR
    // and the parent gates by `NODE_ENV` anyway, but be defensive
    // in case someone calls this component directly elsewhere.
    if (typeof window === 'undefined') return undefined;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      if (cancelled) return;
      try {
        const response = await fetch('/api/content/ready', {
          // Each tick is a fresh probe — don't let any
          // intermediate cache shortcut the answer.
          cache: 'no-store'
        });
        if (cancelled) return;

        if (response.status === 404) {
          // Endpoint is gated off (prod build, or someone removed
          // it). Recovery isn't possible; stop polling and let the
          // static 404 stand.
          setStatus('stopped');
          return;
        }

        const data = (await response.json().catch(() => null)) as ReadyResponse | null;
        if (cancelled) return;

        if (data?.ready) {
          // One refresh is enough: the new RSC payload either
          // renders the page (cold-start case, recovery worked)
          // or re-renders the same not-found (genuine 404).
          // Either way we're done — stop polling so we don't
          // hammer `router.refresh()` indefinitely.
          setStatus('refreshing');
          router.refresh();
          return;
        }

        // Not ready yet — schedule the next probe.
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        // Network blip between browser and Next.js (rare on
        // localhost). Treat as "still waiting"; the next tick
        // will probably succeed.
        if (cancelled) return;
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    // Fire the first probe immediately rather than waiting one
    // interval — minimises the recovery window for the common
    // case where the upstream is already ready by the time the
    // not-found page paints.
    void poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [router]);

  if (status === 'stopped') return null;

  // Inline status hint. Kept minimal so it slots into whatever
  // chrome the `<Page404 />` body renders without needing layout
  // surgery. Dev-only render — no need to thread translations
  // through the i18n store.
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        marginTop: '1rem',
        padding: '0.75rem 1rem',
        borderRadius: '4px',
        background: 'var(--salt-container-secondary-background, #f4f4f4)',
        color: 'var(--salt-content-secondary-foreground, #555)',
        fontSize: '0.875rem',
        textAlign: 'center'
      }}
    >
      {status === 'refreshing'
        ? 'Mosaic content is ready — reloading…'
        : 'Waiting for the Mosaic CLI to finish loading content…'}
    </div>
  );
}
