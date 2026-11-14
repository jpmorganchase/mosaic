'use client';

/**
 * Client-side URL canonicaliser, mounted by `page.tsx` when the browser
 * URL is the folder shorthand of the page's canonical route.
 *
 * **Why this exists.** A folder pathname like `/mosaic/getting-started`
 * renders `/mosaic/getting-started/index`: in active mode `page.tsx`
 * follows the content server's 302 server-side, and in snapshot modes
 * the loader serves the folder's index directly. Rendering under the
 * original URL keeps the navigation a single client commit (the page
 * chrome doesn't unmount mid-flight) and avoids the ~150 ms
 * blank-chrome flash that a `redirect()` call would otherwise produce.
 *
 * The downside is that the browser bar shows `/mosaic/getting-started`
 * instead of the canonical `/mosaic/getting-started/index` — fine for
 * SEO (we emit `<link rel="canonical">` in `generateMetadata`) but worse
 * for "copy URL" UX.
 *
 * This component rewrites only the URL bar after commit. It passes the
 * current `history.state` through unchanged: on a full page load this
 * effect runs before the App Router has patched `history.replaceState`,
 * so a `null` state would erase the router's entry (`__NA` and its tree)
 * and Back/Forward to this entry would stop restoring the page. The
 * router itself keeps the folder URL until the next navigation, which
 * renders the same content. `router.replace` is avoided because it would
 * fetch and render the canonical URL a second time and remount the page.
 *
 * Renders nothing — pure side-effect component.
 */
import { useLayoutEffect } from 'react';

export function CanonicalizeUrl({ canonical }: { canonical: string }) {
  useLayoutEffect(() => {
    if (window.location.pathname !== canonical) {
      const { search, hash } = window.location;
      window.history.replaceState(window.history.state, '', `${canonical}${search}${hash}`);
    }
  }, [canonical]);
  return null;
}
