'use client';

/**
 * Last-resort error boundary for failures in the root layout itself,
 * which `error.tsx` can't catch because it renders inside that layout.
 *
 * It replaces the whole document, so it renders its own `<html>` and
 * `<body>` and deliberately avoids the site's providers, fonts and CSS —
 * they may be what failed. In production, server error messages are
 * replaced by a digest, which is shown so it can be matched to the
 * server logs.
 */
import { useEffect } from 'react';

export default function GlobalError({
  error,
  retry
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error('[Mosaic] unhandled root layout error', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: '4rem 1.5rem',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center'
        }}
      >
        <title>Something went wrong</title>
        <h1>Whoops! Something went wrong</h1>
        <p>{error.digest ? `Error reference: ${error.digest}` : 'The page failed to load.'}</p>
        <button type="button" onClick={() => retry()}>
          Try again
        </button>
      </body>
    </html>
  );
}
