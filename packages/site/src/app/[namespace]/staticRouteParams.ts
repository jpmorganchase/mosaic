/**
 * Prerendered paths for the namespace page (`/mosaic`, `/about`) and the
 * catch-all page below it (`/mosaic/getting-started/index`).
 *
 * The catch-all is required (`[...route]`), not optional (`[[...route]]`),
 * so namespace roots need their own page. Next.js treats an optional
 * catch-all whose only value is `index` as empty on the server, so it
 * served `/mosaic/index` from the `/mosaic` entry while the client router
 * expected `route: ['index']`. Prefetching the page then never settled:
 * the namespace 404 page requested `/mosaic/index` hundreds of times a
 * second.
 */
import { loadSitemap } from '@jpmorganchase/mosaic-site-middleware';

import { getSiteConfig } from '../../lib/config';

export type StaticRouteParams = { namespace: string; route: string[] };

const isSnapshotMode = getSiteConfig().mode.startsWith('snapshot');

/**
 * Only production snapshot builds prerender pages. Snapshot dev builds
 * read MDX on each request, so edits show up, and active mode always
 * renders at request time.
 */
export const shouldPrerenderSnapshot = isSnapshotMode && process.env.NODE_ENV === 'production';

/**
 * In active builds, both pages return this synthetic path so Next
 * encounters `connection()` during its build probe and classifies them as
 * request-time rendered. Returning [] instead opts into on-demand static
 * generation, whose first request would then fail when it reaches the
 * request-only APIs. No page is emitted for the probe.
 */
export const DYNAMIC_PROBE_NAMESPACE = '__mosaic_dynamic_probe__';

/** Every URL in `sitemap.xml`, as namespace and route segments. */
export async function loadStaticRouteParams(): Promise<StaticRouteParams[]> {
  const urls = await loadSitemap();
  const routes = new Map<string, StaticRouteParams>();
  for (const url of urls) {
    const [namespace, ...route] = url.split('/').filter(Boolean);
    if (!namespace) continue;
    routes.set([namespace, ...route].join('/'), { namespace, route });
    // Export the short URL of a known top-level index too. The page
    // resolver decides whether it is a document, alias or folder; the
    // first URL segment alone does not identify a source namespace.
    if (route.length === 1 && route[0] === 'index') {
      routes.set(namespace, { namespace, route: [] });
    }
  }
  return [...routes.values()];
}
