'use client';

/**
 * Route error boundary (renders inside the root layout).
 *
 * Renders the styled `<Hero>` (from `@jpmorganchase/mosaic-components`)
 * directly rather than `<Page500>` from `mosaic-site-components`,
 * because we need the dynamic `error.message` description and an
 * actionable "Try again" button — `<Page500>` exposes neither (it
 * hardcodes the strings and accepts no children/props). The visual
 * matches `<Page500>` exactly; we're just inlining the wrapper.
 *
 * "Try again" calls `retry()`, which re-fetches and re-renders the
 * failed segment, Server Components included. (`reset()` only
 * re-renders on the client, so it can't recover from a server-side
 * failure such as an unreachable content server.)
 *
 * `'use client'` is mandatory for App Router `error.tsx`. It's also
 * required by `<Hero>` itself, which reads `useImageComponent()` from
 * React context — the `ImageContext` default is the native `'img'`
 * tag, so no extra `<ImageProvider>` wrap is needed here.
 */
import { useEffect } from 'react';
import { Button, Hero } from '@jpmorganchase/mosaic-components';

export default function RouteError({
  error,
  retry
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error('[Mosaic] unhandled route error', error);
  }, [error]);

  return (
    <Hero description={error.message} image="/img/500.png" title="Whoops! something went wrong">
      <Button onClick={() => retry()}>Try again</Button>
    </Hero>
  );
}
