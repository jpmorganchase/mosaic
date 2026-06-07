/**
 * Top-level App Router catch-all (WS-3 / WS-9).
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
 * `<MdxRenderer />`. When the URL carries `?edit=1` we render
 * `<EditorBody />` instead — the Lexical editor lazily code-split
 * behind a Suspense boundary so VIEW mode never pays its cost.
 *
 * Edit-mode auth gate: `?edit=1` requires a signed-in session. The
 * check happens here in the server component so the editor bundle is
 * never even shipped to an un-authenticated client.
 *
 * Static-export path: when `MOSAIC_MODE` starts with `snapshot`,
 * this route is `force-static` and `generateStaticParams` enumerates
 * every URL from the snapshot's `sitemap.xml`. The edit branch is
 * unreachable in a static export (no `auth()` available, no Server
 * Actions) so we ignore `?edit=1` and always render the body.
 *
 * Metadata: `generateMetadata` reuses `getMdxRaw` for frontmatter, and
 * because both loaders are `cache()`-wrapped the underlying file/HTTP
 * read happens once per request even though `generateMetadata` and
 * the page render both consume it.
 */
import { cache } from 'react';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { MosaicMode } from '@jpmorganchase/mosaic-types';
import {
  getMdxRaw,
  getMdxRawSource,
  getSearchData,
  getSharedConfig,
  loadSitemap
} from '@jpmorganchase/mosaic-site-middleware';

import { auth } from '../../auth';
import { AUTH_ENABLED } from '../../auth';
import { StoreShell } from '../providers';
import { BodyServer } from './BodyServer';
import { RouteMetadata } from './RouteMetadata';
import { buildNewPageTemplate, composeTemplate } from './newPageTemplate';

// Code-split the Lexical-based editor behind `next/dynamic`. Because
// the import lives at module top level (the natural place for any
// component reference), a static `import { EditorBody } from
// './EditorBody'` would land `EditorBody.tsx` and its transitive
// deps (including Lexical, ~300KB gzipped) in this route's client
// manifest unconditionally — every VIEW-mode visitor would download
// the editor chunk even though it's only mounted on the
// `?edit=1`/`?new=1` branches.
//
// `next/dynamic` defers the JS fetch until the component actually
// renders, so VIEW-mode pages skip the cost entirely and the editor
// only ships on the EDIT/CREATE branches where it's about to run.
//
// We don't set `ssr: false` (which would require a client component
// host anyway) because `EditorBody` is already `'use client'` and
// we want the RSC payload to include its placeholder slot so React's
// hydration sequencing stays predictable.
const EditorBody = dynamic(() => import('./EditorBody').then(m => m.EditorBody));

interface PageProps {
  params: Promise<{ route?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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

/**
 * Dev-only escape hatch for the source-capability gate.
 *
 * The gate (see the edit/create branch below) hides the editor on
 * pages whose owning source has not declared `capabilities.writable
 * = true`. In this repo's own dev environment the docs are served
 * via `source-local-folder`, which is correctly non-writable —
 * which would also lock out the editor's own e2e tests (and any
 * hand-iteration against local content).
 *
 * Setting `MOSAIC_DEV_BYPASS_CAPABILITY_GATE=true` makes every page
 * present as if it were from a writable source. The bypass is
 * hard-guarded against production: `NODE_ENV` must not be
 * `production`, and a boot-time warning fires so the leak is
 * impossible to miss.
 *
 * The bypass works by rewriting the per-route `sharedConfig` to
 * force `sourceCapabilities.writable = true` before the page
 * renders. That keeps the override server-side and means the
 * client-side `useSourceCapabilities()` hook needs no parallel
 * env-var coordination — both server and browser see the same
 * (overridden) capability snapshot.
 */
const CAPABILITY_GATE_BYPASSED =
  process.env.NODE_ENV !== 'production' && process.env.MOSAIC_DEV_BYPASS_CAPABILITY_GATE === 'true';

if (CAPABILITY_GATE_BYPASSED) {
  // eslint-disable-next-line no-console
  console.warn(
    '[mosaic-site] MOSAIC_DEV_BYPASS_CAPABILITY_GATE is enabled — ' +
      'the editor is mounted on every page regardless of source ' +
      'writability. Do NOT enable this in production.'
  );
}

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

export default async function RoutePage({ params, searchParams }: PageProps) {
  const { pathname, mode, contentUrl } = await resolveRouteInputs(params);

  // The three loaders are independent — fetch them concurrently.
  // `getMdxRaw` hits the same `cache()` entry that `generateMetadata`
  // already populated, so it's a free read here. `getSharedConfig` and
  // `getSearchData` are also `cache()`'d but were not touched by
  // `generateMetadata` (it only needs frontmatter), so this is the
  // first call for them this request.
  //
  // `searchParams` is awaited alongside them so the `?edit=1` check
  // costs no extra latency — but only when we're *not* prerendering.
  // Awaiting `searchParams` during a static-export prerender promotes
  // the route to dynamic and breaks the build; the EDIT branch is
  // unreachable in static export anyway (auth() is stubbed).
  const [mdx, sharedConfigOriginal, search, sp] = await Promise.all([
    getMdxRaw(pathname, mode, contentUrl),
    getSharedConfig(pathname, mode, contentUrl),
    getSearchData(mode, contentUrl),
    shouldPrerenderSnapshot
      ? (Promise.resolve({}) as Promise<Record<string, string | string[] | undefined>>)
      : searchParams
  ]);

  // Apply the dev capability-bypass to the shared config before
  // anyone (server gate, store, client hook) reads it. The override
  // is the closed default — `{ writable: true }` — applied via a
  // shallow merge so authored fields (header, footer, etc.) are
  // preserved.
  const sharedConfig = CAPABILITY_GATE_BYPASSED
    ? {
        ...(sharedConfigOriginal ?? {}),
        sourceCapabilities: {
          ...(sharedConfigOriginal?.sourceCapabilities ?? {}),
          writable: true
        }
      }
    : sharedConfigOriginal;

  if (mdx.kind === 'redirect') redirect(mdx.destination);
  // For a normal view/edit request a missing page is a 404. For
  // a `?new=1` request a missing page is EXPECTED (the file
  // doesn't exist yet — we're about to create it) so we hand
  // off to the create-mode branch below instead of 404'ing.
  // The auth gate inside that branch is the actual security
  // boundary; unauthenticated `?new=1` requests fall through
  // to the same 404 the view branch would have produced.
  const newRequested = sp.new === '1';
  const newPossible = newRequested && !shouldPrerenderSnapshot;
  // Source-capability gate. Absent capabilities (no shared-config
  // for the subtree, or a source that hasn't opted in) means
  // `writable` is `false` — the closed default. Applies equally
  // to the edit and create branches; a hand-typed `?edit=1` or
  // `?new=1` against a non-writable page falls through to view
  // mode rather than mounting the editor for a save that would
  // fail at the workflows layer.
  const isWritableSource = sharedConfig?.sourceCapabilities?.writable === true;
  if (mdx.kind === 'not-found' && !(newPossible && isWritableSource)) notFound();

  // `mdx.kind === 'mdx' | 'not-found'` from here on. For the
  // `not-found + newPossible` case `raw` doesn't exist; we
  // synthesise the body below from a blank-page template.
  const onDiskFrontmatter = mdx.kind === 'mdx' ? mdx.frontmatter : ({} as Record<string, unknown>);
  const onDiskRaw = mdx.kind === 'mdx' ? mdx.raw : '';
  // Strip `sharedConfig` out of the frontmatter spread below.
  //
  // Background: index pages may author a `sharedConfig` in their
  // own frontmatter (header / footer / menu for the subtree). The
  // `SharedConfigPlugin` already lifts that authored value into the
  // namespace's `shared-config.json`, which is what `getSharedConfig`
  // loads back into the `sharedConfig` const above. Re-spreading
  // `onDiskFrontmatter.sharedConfig` on top would just overwrite
  // the loader-derived copy with the (identical) authored one —
  // EXCEPT that the loader-derived copy is what the
  // `CAPABILITY_GATE_BYPASSED` block (and, in non-dev builds, the
  // SharedConfigPlugin's `sourceCapabilities` stamping) enriches
  // with the writability flag. The frontmatter copy carries no
  // `sourceCapabilities` field, so the spread silently clobbers the
  // bypass on exactly the index pages that authored a sharedConfig,
  // hiding `<EditorControls>` on the docs landing page while every
  // non-index page in the same namespace shows them.
  const { sharedConfig: _frontmatterSharedConfig, ...frontmatterRest } = onDiskFrontmatter as {
    sharedConfig?: unknown;
  } & Record<string, unknown>;
  const storeProps = {
    searchIndex: search.searchIndex,
    searchConfig: search.searchConfig,
    ...frontmatterRest,
    sharedConfig
  };

  // If `?new=1` was requested AND the route already exists on
  // disk, the create flow is unsafe (we'd silently clobber the
  // existing page on save). Redirect to the existing route in
  // edit mode with an `existed=1` query the dialog can surface
  // as a hint. We do this here rather than in the dialog so the
  // editor never even mounts for a route the author misidentified.
  //
  // Skip the redirect when the source isn't writable — there's
  // no edit branch to redirect to, so just fall through and
  // render view mode.
  if (newRequested && mdx.kind === 'mdx' && isWritableSource) {
    redirect(`${pathname}?edit=1&existed=1`);
  }

  // Edit-mode gate: only honour `?edit=1` for signed-in users on a
  // dynamic (non-static-export) deployment, **and** only when the
  // page's owning source has declared itself writable. The auth
  // check happens here on the server so an un-authenticated request
  // never receives the editor bundle at all — defense in depth,
  // regardless of any client-side UI gating in `AppHeaderControls`.
  //
  // The source-capability check is the second defense layer: even
  // a signed-in user can't bypass `AppHeaderControls`'s hidden
  // button by hand-typing `?edit=1` on a page whose source has no
  // backing persistence workflow (a save would fail at the
  // workflows layer anyway — we just refuse to mount the editor
  // for it).
  //
  // When the edit branch is at all possible (`editRequested &&
  // !shouldPrerenderSnapshot`) we speculatively kick off
  // `getMdxRawSource` in parallel with `auth()`. The raw-source
  // fetch is the editor's Frontmatter-tab data source — same shape
  // as `getMdxRaw` but hits the CLI's `/_mosaic-raw/*` endpoint,
  // bypassing the plugin pipeline. Speculating it here costs at
  // most one extra HTTP request when auth ends up failing (still
  // cheap, the route is server-local in active mode); when auth
  // succeeds we've already paid the latency in parallel with the
  // auth check rather than serially after it.
  const editRequested = sp.edit === '1';
  const editPossible = editRequested && !shouldPrerenderSnapshot;
  // Auth is required for both the edit and the create branch.
  // Compute once + share the resulting session promise so we
  // never pay for two `auth()` calls in a single request.
  //
  // `AUTH_ENABLED` is the deployment-wide switch (see `src/auth.ts`).
  // When false, the editor is unreachable end-to-end: `auth()` is the
  // no-op stub that returns `null` anyway, but short-circuiting here
  // avoids importing the session-resolution path at all on no-auth
  // deployments (helping bundlers tree-shake more aggressively).
  const authPossible = AUTH_ENABLED && (editPossible || newPossible) && isWritableSource;
  const sessionPromise = authPossible ? auth() : Promise.resolve(null);
  // Raw-source fetch is only meaningful for the edit branch.
  // For the create branch we synthesise a raw envelope below
  // (`effectiveRawSource`) around the same template bytes the
  // body editor is seeded with, so the Frontmatter tab gets the
  // editable form rather than the read-only viewer — there's
  // no on-disk file to fetch for a page that doesn't exist yet.
  // Gated on `isWritableSource` too — no point fetching raw
  // bytes for a page the editor will refuse to mount.
  const rawSourcePromise =
    editPossible && isWritableSource
      ? getMdxRawSource(pathname, mode, contentUrl)
      : Promise.resolve(undefined);
  const [session, rawSource] = await Promise.all([sessionPromise, rawSourcePromise]);
  const editing = editRequested && isWritableSource && mdx.kind === 'mdx' && session?.user != null;
  const creating = newPossible && isWritableSource && session?.user != null;
  const editorUser =
    (editing || creating) && session?.user
      ? {
          sid:
            (session.user as { sid?: string }).sid ?? session.user.email ?? session.user.name ?? '',
          displayName: session.user.name ?? '',
          email: session.user.email ?? ''
        }
      : undefined;

  // Blank-page template for the create branch. The title comes
  // from `?title=...` (URL-encoded by the New-Page dialog);
  // fall back to "New Page" if absent so the editor still has
  // a sensible title to render.
  //
  // Sanitisation: strip `---` (would break out of the
  // frontmatter block) before injection. Trim to bound the
  // string the user can dump into the template. The actual YAML
  // quoting / escaping is handled by `gray-matter.stringify`
  // inside `composeTemplate`, so we don't have to think about
  // embedded newlines, quotes, or backticks here.
  //
  // The body skeleton itself is delegated to
  // `./newPageTemplate.ts` so each app integrator can customise
  // it (different starter content per folder, extra required
  // frontmatter keys for their layout set, etc.) without
  // editing this route. See the doc comments at the top of that
  // file for the contract.
  const sanitiseTitle = (t: string) => t.replace(/---+/g, '').trim().slice(0, 200) || 'New Page';
  const newPageTitle = creating
    ? sanitiseTitle(typeof sp.title === 'string' ? sp.title : 'New Page')
    : '';
  const newPageRaw = creating
    ? composeTemplate(
        buildNewPageTemplate({
          title: newPageTitle,
          pathname,
          parentFolder: pathname.replace(/\/[^/]*$/, '')
        })
      )
    : '';
  // Pick the body bytes the editor will be seeded with. Create
  // branch: the synthesised template. Edit / view branch: the
  // on-disk raw bytes.
  const raw = creating ? newPageRaw : onDiskRaw;

  // Frontmatter editor wiring for the create branch.
  //
  // `FrontmatterPanel` mounts the editable `FrontmatterEditor`
  // ONLY when it receives a `rawSource` of `{ kind: 'raw', ... }`
  // — every other shape (including the `undefined` we'd otherwise
  // pass for new pages) falls through to the read-only viewer.
  // For new pages the synthesised template IS the authored
  // source (there's nothing on disk yet to fetch), so we
  // synthesise a matching `raw` envelope around the same bytes
  // and pass that in. The result is that the Frontmatter tab is
  // immediately editable on a new page, seeded with whatever the
  // template put in the YAML block (currently `title: ...`),
  // and the save dialog's existing `frontmatter` payload path
  // picks up any edits unmodified.
  //
  // `namespace` is `undefined` because the page doesn't yet
  // belong to a Mosaic namespace — that gets resolved when the
  // file is committed and the source picks it up. The editor's
  // `pillLabel` falls back to "On-disk source" rather than
  // "On-disk source · <ns>" in that case, which is the right
  // copy for a not-yet-written file.
  const effectiveRawSource = creating
    ? ({ kind: 'raw', bytes: newPageRaw, namespace: undefined } as const)
    : rawSource;

  // Intentionally no nested `<Suspense>` and no sibling `loading.tsx`
  // at the route segment for the VIEW branch. When a `<Link>`-driven
  // navigation enters a React transition (the default) *and* there is
  // no Suspense fallback above the suspending server component, React
  // keeps the previous committed UI mounted until the new RSC payload
  // is ready, then swaps — no flash. A segment-level `loading.tsx`
  // would force the fallback to show *during* the transition,
  // re-creating the flash.
  //
  // The EDIT/CREATE branch resolves `EditorBody` via `next/dynamic`
  // (declared at module top). The dynamic chunk loads asynchronously
  // on the first edit/create render; React's built-in Suspense
  // handling for dynamic components keeps the previous UI on screen
  // until the chunk arrives, then swaps in `<EditorBody>` — same
  // no-flash behaviour as VIEW.
  return (
    <StoreShell storeProps={storeProps}>
      <RouteMetadata />
      {editing || creating ? (
        <EditorBody
          raw={raw}
          rawSource={effectiveRawSource}
          user={editorUser}
          isNewPage={creating}
        />
      ) : (
        <BodyServer type="mdx" raw={raw} />
      )}
    </StoreShell>
  );
}
