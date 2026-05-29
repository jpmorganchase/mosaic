'use client';

/**
 * Global error boundary.
 *
 * Renders the styled `<Hero>` (from `@jpmorganchase/mosaic-components`)
 * directly rather than `<Page500>` from `mosaic-site-components`,
 * because we need the dynamic `error.message` description and an
 * actionable "Try again" button — `<Page500>` exposes neither (it
 * hardcodes the strings and accepts no children/props). The visual
 * matches `<Page500>` exactly; we're just inlining the wrapper.
 *
 * `'use client'` is mandatory for App Router `error.tsx`. It's also
 * required by `<Hero>` itself, which reads `useImageComponent()` from
 * React context — the `ImageContext` default is the native `'img'`
 * tag, so no extra `<ImageProvider>` wrap is needed here.
 */
import { useEffect } from 'react';
import { Button, Hero } from '@jpmorganchase/mosaic-components';

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[Mosaic] unhandled route error', error);
  }, [error]);

  return (
    <Hero description={error.message} image="/img/500.png" title="Whoops! something went wrong">
      <Button onClick={() => reset()}>Try again</Button>
    </Hero>
  );
}
