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
      /* fall through to fallback; layout.tsx surfaces the warning */
    }
  }
  return FALLBACK_ORIGIN;
}
