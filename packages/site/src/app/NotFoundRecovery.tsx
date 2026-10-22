'use client';

/**
 * Dev-only auto-recovery from cold-start 404s.
 *
 * The Mosaic CLI's FS server has a startup window between "process
 * started" and "first source emission is on the volume". A page load
 * that lands in that window renders the global not-found page (the
 * catch-all route resolves `mdx.kind === 'not-found'` and calls
 * `notFound()`), and the user had to keep reloading until the CLI
 * caught up.
 *
 * This component, mounted by `<NotFoundBody>` in `next dev` only:
 *
 *   1. Polls `/api/content/ready` on a fixed cadence. The endpoint
 *      probes the upstream and returns `{ ready: true }` once it
 *      responds with a 2xx (immediately in snapshot modes).
 *   2. Once the upstream is ready, asks the server whether the current
 *      URL resolves now (a `HEAD` request). If it does, it reloads the
 *      page. A full reload is required: `router.refresh()` fetches the
 *      new content but leaves Next's not-found boundary showing the
 *      404. If the URL still 404s, the page genuinely doesn't exist and
 *      the component stops, so there are no reload loops.
 *   3. Shows a discreet inline hint only while it is actually waiting
 *      for the CLI, so genuine 404s look exactly as they do in
 *      production.
 *
 * Endpoint missing (the route answers 404 outside `next dev`): the
 * poller treats that as terminal and stops.
 *
 * The polling cadence is deliberately fixed at 1.5 s rather than an
 * exponential backoff. The upstream is on the same host (dev loopback)
 * and the probe is cheap; biasing for *latency* of recovery matters
 * more than minimising request count.
 */
import { useEffect, useState } from 'react';

const POLL_INTERVAL_MS = 1_500;

type ReadyResponse = { ready: boolean; mode?: string; reason?: string; status?: number };

export function NotFoundRecovery() {
  // `checking`: first probe in flight, render nothing yet.
  // `waiting`: the CLI isn't ready; render the waiting hint.
  // `reloading`: the URL resolves now and a reload is under way.
  // `stopped`: genuine 404 or no readiness endpoint; render nothing.
  const [status, setStatus] = useState<'checking' | 'waiting' | 'reloading' | 'stopped'>(
    'checking'
  );

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleNextPoll = () => {
      if (!cancelled) timer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    const pageResolvesNow = async () => {
      const response = await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' });
      return response.ok;
    };

    async function poll() {
      if (cancelled) return;
      try {
        // Each tick is a fresh probe; don't let any cache answer it.
        const response = await fetch('/api/content/ready', { cache: 'no-store' });
        if (cancelled) return;

        if (response.status === 404) {
          // Endpoint gated off. Recovery isn't possible.
          setStatus('stopped');
          return;
        }

        const data = (await response.json().catch(() => null)) as ReadyResponse | null;
        if (cancelled) return;

        if (!data?.ready) {
          setStatus('waiting');
          scheduleNextPoll();
          return;
        }

        const resolves = await pageResolvesNow();
        if (cancelled) return;
        if (resolves) {
          setStatus('reloading');
          window.location.reload();
        } else {
          setStatus('stopped');
        }
      } catch {
        // Network blip between browser and Next.js (rare on localhost).
        // Treat as "still waiting"; the next tick will probably succeed.
        scheduleNextPoll();
      }
    }

    // Probe immediately rather than waiting one interval: the upstream is
    // often ready by the time the not-found page paints.
    void poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (status !== 'waiting' && status !== 'reloading') return null;

  // Inline status hint. Kept minimal so it slots into whatever chrome
  // `<Page404 />` renders without needing layout surgery. Dev-only, so
  // no translations.
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
      {status === 'reloading'
        ? 'Mosaic content is ready — reloading…'
        : 'Waiting for the Mosaic CLI to finish loading content…'}
    </div>
  );
}
