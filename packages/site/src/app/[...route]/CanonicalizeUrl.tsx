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
 * emit `<link rel="canonical">` in `generateMetadata`) but slightly
 * worse for "copy URL" UX and for App Router's own routing state
 * (which keys subsequent navs against the visible URL).
 *
 * This component fixes the URL bar after first paint by calling
 * `router.replace(canonical, { scroll: false })`. Because the
 * destination's RSC payload was already used to render the
 * current view, App Router's cache has it; the replace is a
 * near-instant commit that doesn't unmount anything. The
 * one-frame URL flicker is the trade-off for keeping the chrome
 * mounted across the actual navigation.
 *
 * `useLayoutEffect` runs after commit but before paint, so the
 * replace is scheduled as soon as React thinks the page is on
 * screen — gives App Router the smallest possible window to
 * intercept clicks against the stale URL.
 *
 * Renders nothing — pure side-effect component.
 */
import { useLayoutEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function CanonicalizeUrl({ canonical }: { canonical: string }) {
  const router = useRouter();
  const currentPathname = usePathname();
  useLayoutEffect(() => {
    if (currentPathname !== canonical) {
      router.replace(canonical, { scroll: false });
    }
  }, [router, currentPathname, canonical]);
  return null;
}
