/**
 * Single source of truth for the site's canonical origin.
 *
 * Consumed by:
 *   - `app/layout.tsx` → `metadata.metadataBase` (per-page OG/Twitter
 *     image URL resolution).
 *   - `app/sitemap.ts` → absolute `<loc>` URLs (sitemaps.org requires
 *     absolute).
 *   - `app/robots.ts`  → absolute `Sitemap:` line (crawlers are
 *     inconsistent about resolving relative ones).
 *
 * Resolution rule:
 *   `NEXT_PUBLIC_SITE_URL` (parsed via `new URL()`) wins. Falls back
 *   to `http://localhost:3000` for dev / CI. Production-without-env
 *   is loud-warned by `app/layout.tsx` once at module init; the other
 *   callers don't re-warn to avoid log noise.
 *
 * Returning a string `origin` (rather than the full `URL`) because the
 * callers either want `${origin}/path` strings or pass it to
 * `new URL(path, origin)` — both prefer the plain origin.
 */

const FALLBACK_ORIGIN = 'http://localhost:3000';

export function resolveSiteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) {
    try {
      return new URL(fromEnv).origin;
    } catch {
      // In production a misconfigured env var silently falls
      // back to localhost and every sitemap URL points at the
      // wrong host — visible to crawlers, invisible to humans
      // doing a smoke test. Warn loudly so the boot log
      // surfaces it. In dev we expect this path during early
      // setup so stay quiet.
      if (process.env.NODE_ENV === 'production') {
        // eslint-disable-next-line no-console
        console.warn(
          `[mosaic-site] NEXT_PUBLIC_SITE_URL=${fromEnv!} is not a valid URL; ` +
            `falling back to ${FALLBACK_ORIGIN}. Sitemap and robots URLs will be wrong.`
        );
      }
    }
  }
  return FALLBACK_ORIGIN;
}
