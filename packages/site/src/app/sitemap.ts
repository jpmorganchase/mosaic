/**
 * App Router native sitemap convention.
 *
 * Next will serve this at `/sitemap.xml`. The data is sourced from
 * `loadSitemap()` (the same function `generateStaticParams` uses for
 * the static-export build), so the sitemap stays in lockstep with
 * whatever the Mosaic snapshot says exists. No second source of truth
 * to drift out of sync.
 *
 * Why not just serve the snapshot's own `sitemap.xml`?
 *
 *   The Mosaic CLI bakes its `siteUrl` into the snapshot's
 *   `sitemap.xml` at build time (e.g.
 *   `https://mosaic-mosaic-dev-team.vercel.app/...`). That's wrong for
 *   any deployment with a different hostname — preview branches,
 *   self-hosted, local dev. Generating the sitemap here lets the
 *   per-environment `NEXT_PUBLIC_SITE_URL` supply the hostname.
 *
 *   The matching `public/sitemap.xml` (if any) must be deleted — Next
 *   refuses to start when a public/ file and an app/ route collide on
 *   the same path. The Mosaic build pipeline used to drop a stale copy
 *   in `public/` from the snapshot; that's removed by this migration.
 *
 *   Per-page `lastModified` is intentionally omitted: it would cost a
 *   read + frontmatter parse of every MDX file at sitemap-render time
 *   (~95 reads today, growing with the docs). Search engines treat
 *   missing `lastmod` as "don't know" rather than "never changed", so
 *   the SEO downside is small and you can revisit this later if it
 *   matters.
 *
 *   `changeFrequency` and `priority` are constants matching what the
 *   Mosaic `SiteMapPlugin` emits today (`weekly` / `0.5`); a doc site
 *   doesn't have meaningful per-page variation in either.
 *
 * Absolute URLs: sitemaps.org requires `<loc>` entries to be absolute
 * URLs. Next *does not* automatically apply `metadataBase` to sitemap
 * URLs — that only governs page-level Open Graph / Twitter card
 * metadata. So we read `NEXT_PUBLIC_SITE_URL` directly here, matching
 * the resolution rule in `app/layout.tsx`.
 */
import type { MetadataRoute } from 'next';
import { loadSitemap } from '@jpmorganchase/mosaic-site-middleware';

import { resolveSiteOrigin } from '../lib/siteOrigin';

// Snapshot builds want a fully static `/sitemap.xml` baked at build
// time (it's part of the static export tarball). Active mode reads
// from the live Mosaic FS server on each request, so forcing static
// would freeze the output to whatever existed at first render and
// hide subsequent author edits / new pages from the New-Page dialog's
// folder suggestions. `revalidate = 0` opts the route out of the data
// cache in active mode (equivalent to `dynamic = 'force-dynamic'` for
// caching purposes — `revalidate` is the older / more granular knob
// and the one Next's sitemap convention happens to honour). In a
// `next build` static export the route is rendered exactly once at
// build time so the value is moot there.
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = resolveSiteOrigin();
  const urls = await loadSitemap();
  return urls.map(pathname => ({
    url: new URL(pathname, origin).toString(),
    changeFrequency: 'weekly',
    priority: 0.5
  }));
}
