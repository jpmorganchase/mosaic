/**
 * App Router native `robots.txt`. Served at `/robots.txt`.
 *
 * Default: allow everything, point crawlers at the dynamic
 * `/sitemap.xml` (emitted by `app/sitemap.ts`). If a deployment ever
 * needs to disallow private paths (e.g. `/api/*`, an editor preview
 * route), extend `disallow` here — keeping this colocated with the
 * sitemap avoids the classic "where do I configure crawl rules"
 * confusion.
 *
 * The `Sitemap:` line is emitted as an absolute URL because crawlers
 * are inconsistent about resolving relative ones; `metadataBase` only
 * governs page-level metadata, not the robots route. Same env source
 * as `app/sitemap.ts` so the two stay in step.
 */
import type { MetadataRoute } from 'next';

import { resolveSiteOrigin } from '../lib/siteOrigin';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  const origin = resolveSiteOrigin();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/'
      }
    ],
    sitemap: `${origin}/sitemap.xml`
  };
}
