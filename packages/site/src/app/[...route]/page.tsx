/**
 * Top-level App Router catch-all — the production page for every Mosaic
 * MDX route.
 *
 * Data loading: the three independent inputs — `sharedConfig`
 * (header/footer/nav), `searchData` (site-wide search index), and the
 * raw MDX text — are resolved in parallel via three
 * `cache()`+`unstable_cache()`-wrapped primitives exported by
 * `mosaic-site-middleware`. Wall-clock per request is `max(steps)`
 * instead of `sum(steps)`, and identical reads across pages (notably
 * the site-wide search files) collapse to a single backing fetch.
 * Invalidation is by `revalidateTag('mosaic-content')` from
 * `app/api/revalidate/route.ts`.
 *
 * MDX rendering: `<BodyServer />` serialises the raw MDX text with
 * `serializeMdxForClient` and hands the result to the client
 * `<MdxRenderer />`.
 *
 * Static-export path: when `MOSAIC_MODE` starts with `snapshot`,
 * this route is `force-static` and `generateStaticParams` enumerates
 * every URL from the snapshot's `sitemap.xml`.
 *
 * Metadata: `generateMetadata` reuses `getMdxRaw` for frontmatter, and
 * because both loaders are `cache()`-wrapped the underlying file/HTTP
 * read happens once per request even though `generateMetadata` and
 * the page render both consume it.
 */
import { cache } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { MosaicMode } from '@jpmorganchase/mosaic-types';
import {
  getMdxRaw,
  getSearchData,
  getSharedConfig,
  loadSitemap
} from '@jpmorganchase/mosaic-site-middleware';

import { auth } from '../../auth';
import { StoreShell } from '../providers';
import { BodyServer } from './BodyServer';
import { RouteMetadata } from './RouteMetadata';

// `auth` (Auth.js v5) is imported but not awaited in the catch-all
// page render. The client `<SessionProvider>` set up in
// `app/layout.tsx` already kicks off a session fetch on mount.
// Keeping the import here exercises the module-evaluation side
// effects (NextAuth config validation) at page-render time so
// misconfigurations surface during a request rather than only on a
// `/api/auth/*` hit. Reference it explicitly so the bundler doesn't
// tree-shake it away.
void auth;

interface PageProps {
  params: Promise<{ route?: string[] }>;
}

// Route segment config. We deliberately don't export `dynamic` here:
// the App Router infers the right mode from `generateStaticParams`.
//
//   - Snapshot **production** build → `generateStaticParams` returns
//     every URL from `sitemap.xml`; Next pre-renders them all at build
//     time. With `dynamicParams = true` (the default) requests for any
//     unknown path fall through to on-demand SSR (which fails with 404
//     via `notFound()` from the page below — same behaviour as a
//     static export's missing file).
//   - Snapshot **dev** build → treated like active mode (see below) so
//     hand-edits to MDX files under `snapshots/` show up on the next
//     navigation without a dev-server restart. Pre-rendering in `next
//     dev` would defeat hot-reload because the route's RSC payload
//     would be cached after first render and the underlying
//     `fs.readFile` for the MDX would never run again.
//   - Active build → `generateStaticParams` returns `[]`; every
//     request is rendered on demand.
//
// Setting `dynamic = 'force-dynamic'` would defeat the snapshot
// pre-render and was only needed earlier as a workaround for a
// conditional that App Router refuses to statically analyse.
const isSnapshotMode = process.env.MOSAIC_MODE?.startsWith('snapshot') ?? false;
const isProductionBuild = process.env.NODE_ENV === 'production';
const shouldPrerenderSnapshot = isSnapshotMode && isProductionBuild;

export async function generateStaticParams(): Promise<{ route: string[] }[]> {
  if (!shouldPrerenderSnapshot) return [];
  const urls = await loadSitemap();
  return urls
    .map(url => url.replace(/^\//, '').split('/').filter(Boolean))
    .filter(segments => segments.length > 0)
    .map(route => ({ route }));
}

/**
 * Resolve the per-request inputs (pathname + Mosaic mode/contentUrl).
 * `cache()`'d so `generateMetadata` and the page render share one
 * resolution; identity on the returned shape is preserved across
 * calls so downstream `cache()`'d loaders also dedupe.
 *
 * The mode and contentUrl come from env, not request headers.
 */
const resolveRouteInputs = cache(
  async (
    params: PageProps['params']
  ): Promise<{ pathname: string; mode: MosaicMode; contentUrl: string }> => {
    const [{ route = [] }] = await Promise.all([
      params,
      // Call `headers()` whenever we are NOT pre-rendering. In a
      // production snapshot build we want the route fully static
      // (skipping `headers()` is what keeps it that way); in a snapshot
      // dev build we want the opposite — the call opts the route out
      // of static optimisation so MDX file edits are picked up on the
      // next request. In active mode it's mandatory regardless.
      shouldPrerenderSnapshot ? Promise.resolve(undefined) : headers()
    ]);
    const pathname = '/' + route.join('/');
    const mode = (process.env.MOSAIC_MODE || 'active') as MosaicMode;
    const contentUrl = process.env[`MOSAIC_${mode.toUpperCase()}_MODE_URL`] || '';
    return { pathname, mode, contentUrl };
  }
);

/**
 * Server-side metadata. Reuses `getMdxRaw` (whose result contains
 * pre-parsed frontmatter) so the underlying file/HTTP read and YAML
 * parse happen once per request, shared with the page render.
 *
 * Returns an empty `Metadata` for non-success cases (the page render
 * handles redirect / not-found / error signalling and would override
 * whatever metadata we returned anyway).
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { pathname, mode, contentUrl } = await resolveRouteInputs(params);
  const mdx = await getMdxRaw(pathname, mode, contentUrl);

  if (mdx.kind !== 'mdx') return {};

  const { frontmatter } = mdx;
  const title = typeof frontmatter.title === 'string' ? frontmatter.title : undefined;
  const description =
    typeof frontmatter.description === 'string' ? frontmatter.description : undefined;
  const ogImage = typeof frontmatter.image === 'string' ? frontmatter.image : undefined;
  const lastModified =
    typeof frontmatter.lastModified === 'string' || typeof frontmatter.lastModified === 'number'
      ? String(frontmatter.lastModified)
      : undefined;
  const breadcrumbs = Array.isArray(frontmatter.breadcrumbs)
    ? (frontmatter.breadcrumbs as unknown[])
    : undefined;

  // `other` carries non-standard <meta name="..."> tags. We preserve
  // the historic `lastModified` and `breadcrumbs` (JSON-encoded) names
  // that downstream consumers (analytics scrapers, etc.) may depend
  // on.
  const other: Record<string, string> = {};
  if (lastModified) other.lastModified = lastModified;
  if (breadcrumbs && breadcrumbs.length > 0) other.breadcrumbs = JSON.stringify(breadcrumbs);

  return {
    ...(title && { title }),
    ...(description && { description }),
    openGraph: {
      type: 'article',
      ...(title && { title }),
      ...(description && { description }),
      ...(ogImage && { images: [{ url: ogImage }] })
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      ...(title && { title }),
      ...(description && { description }),
      ...(ogImage && { images: [ogImage] })
    },
    ...(Object.keys(other).length > 0 && { other })
  };
}

export default async function RoutePage({ params }: PageProps) {
  const { pathname, mode, contentUrl } = await resolveRouteInputs(params);

  // The three loaders are independent — fetch them concurrently.
  // `getMdxRaw` hits the same `cache()` entry that `generateMetadata`
  // already populated, so it's a free read here. `getSharedConfig` and
  // `getSearchData` are also `cache()`'d but were not touched by
  // `generateMetadata` (it only needs frontmatter), so this is the
  // first call for them this request.
  //
  // Session is intentionally *not* batched here: Auth.js `auth()` is
  // request-scoped and cannot be safely cached across requests, and
  // the session isn't needed to render the page body — only the
  // session-dependent `<RouteMetadata>` consumes it via
  // `useSession()`, which fetches via `SessionProvider` on the client.
  const [mdx, sharedConfig, search] = await Promise.all([
    getMdxRaw(pathname, mode, contentUrl),
    getSharedConfig(pathname, mode, contentUrl),
    getSearchData(mode, contentUrl)
  ]);

  if (mdx.kind === 'redirect') redirect(mdx.destination);
  if (mdx.kind === 'not-found') notFound();

  // `mdx.kind === 'mdx'` from here on.
  const { raw, frontmatter } = mdx;
  const storeProps = {
    sharedConfig,
    searchIndex: search.searchIndex,
    searchConfig: search.searchConfig,
    ...frontmatter
  };

  // Intentionally no nested `<Suspense>` and no sibling `loading.tsx`
  // at the route segment. When a `<Link>`-driven navigation enters a
  // React transition (the default) *and* there is no Suspense
  // fallback above the suspending server component, React keeps the
  // previous committed UI mounted until the new RSC payload is ready,
  // then swaps — no flash. Adding a `loading.tsx` (segment-level
  // Suspense) or wrapping `<BodyServer />` in `<Suspense fallback>`
  // would force the fallback to show *during* the transition,
  // re-creating the flash. So: no fallback here — let the transition
  // do its job.
  return (
    <StoreShell storeProps={storeProps}>
      <RouteMetadata />
      <BodyServer type="mdx" raw={raw} />
    </StoreShell>
  );
}
