'use client';

/**
 * Client-side URL canonicaliser used when `page.tsx` followed a
 * folder→index redirect in-process (see `resolveContent`).
 *
 * **Why this exists.** The upstream content server emits HTTP 302
 * for folder pathnames like `/mosaic/getting-started`, pointing at
 * the canonical file `/mosaic/getting-started/index`. `page.tsx`
 * follows that redirect server-side and renders the destination's
 * content under the original URL — that keeps the navigation a
 * single client commit (the page chrome doesn't unmount mid-flight)
 * and avoids the ~150 ms blank-chrome flash that a `redirect()`
 * call would otherwise produce.
 *
 * The downside of rendering under the original URL is that the
 * browser bar shows `/mosaic/getting-started` instead of the
 * canonical `/mosaic/getting-started/index` — fine for SEO (we
 * emit `<link rel="canonical">` in `generateMetadata`) but worse for
 * "copy URL" UX and for resolving relative links.
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
