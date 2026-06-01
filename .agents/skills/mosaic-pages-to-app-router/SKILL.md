# Mosaic site: Pages Router → App Router migration

## When to use this skill

Use this skill when migrating a **consumer site built on `@jpmorganchase/mosaic-*`**
from Next.js Pages Router to App Router, or when working on the reference
site (`packages/site`) itself. Trigger phrases:

- "migrate this mosaic site to app router"
- "port a mosaic site off `getServerSideProps`"
- "this mosaic site is still on `src/pages/`, move it"
- "how do I load MDX in the mosaic app router?"
  The canonical reference implementation is `packages/site` in the
  `jpmorganchase/mosaic` monorepo. **Always read its `src/app/` tree and
  `packages/site-middleware/src/` before proposing changes** — they are
  the source of truth.

## Background

`@jpmorganchase/mosaic-site-middleware` no longer ships any Pages Router
context adapter, runner, or compile helper. The legacy
`fromGetServerSidePropsContext` / `createMiddlewareRunner` /
`withMosaicMode` / `withMDXContent` / `fromAppRouter` / `runMiddleware` /
`compileMdxRsc` API has been **deleted**.
The current public surface (`packages/site-middleware/src/index.ts`) is:

```ts
// Server-side MDX serialise → client-side render pipeline
export { serializeMdxForClient } from '@jpmorganchase/mosaic-site-middleware';
// Sitemap loader for static-export / generateStaticParams
export { loadSitemap } from '@jpmorganchase/mosaic-site-middleware';
// Mode + contentUrl env resolver — shared by page.tsx, not-found.tsx, sitemap.ts
export { resolveMosaicMode } from '@jpmorganchase/mosaic-site-middleware';
// App-Router-native, cache()/unstable_cache-wrapped loaders
export {
  getMdxRaw, // raw MDX bytes (post-plugin) + frontmatter
  getMdxRawSource, // raw MDX bytes (pre-plugin, for editor)
  getSharedConfig, // per-subtree header/footer/menu config
  getSearchData, // site-wide search index + config
  MOSAIC_CONTENT_CACHE_TAG // tag name for revalidateTag()
} from '@jpmorganchase/mosaic-site-middleware';
```

All loaders accept `(pathname, mode, contentUrl)` (search takes
`(mode, contentUrl)`) and dispatch internally across the three Mosaic
modes: `active`, `snapshot-file`, `snapshot-s3`. There is no
`withX`/runner pattern any more — the page composes loaders directly.
`resolveMosaicMode()` returns `{ mode, contentUrl }` from `MOSAIC_MODE`
(default `'active'`) + `MOSAIC_<MODE>_MODE_URL`. Use it anywhere you'd
otherwise duplicate the env-read snippet — `not-found.tsx`,
`sitemap.ts`, and `loadSitemap()` all do.
MDX rendering is **server-serialise → client-render**, not pure RSC:

- Server: `serializeMdxForClient(raw)` (uses
  `next-mdx-remote-client/serialize`) returns a JSON-safe
  `{ compiledSource, frontmatter, scope }`. It also auto-injects
  `scope.meta = frontmatter` (Mosaic MDX commonly references
  `{meta.title}` etc.) and, on compile errors, re-runs the bare MDX
  compiler to recover `line` / `column` / `place` for the editor's
  jump-to-error UX.
- That payload crosses the RSC boundary as plain props.
- Client (`'use client'`): `<MDXClient />` from `next-mdx-remote-client`
  evaluates it, supplying the local MDX component registry.
  This shape is deliberate: most Mosaic / Salt-DS components ship hooks
  without a `'use client'` directive in their dist bundles, which trips
  Turbopack's RSC rules. Keeping component refs in the client graph
  avoids the entire boundary-shim problem.

## The migration recipe

### 1. Inventory the Pages Router surface

| Pages file                         | Replacement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_app.tsx`                         | `app/layout.tsx` + `app/providers.tsx` (`'use client'`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `_document.tsx`                    | Inline `<html>`/`<body>` in `app/layout.tsx`; FOUC scripts go in `<head>` as a plain `<script dangerouslySetInnerHTML={{ __html: '...' }} />`. React 19 will log a misleading dev-only warning ("scripts inside React components are never executed when rendering on the client") on HMR / route transitions — the script DID execute on the initial SSR load (which is the only execution FOUC prevention needs); the warning is harmless. Do NOT try to "fix" it by using `next/script` (still triggers the warning regardless of `strategy`) or by moving the script to a direct child of `<html>` (HTML-invalid: `<script> cannot be a child of <html>`). |
| `[...route].tsx`                   | `app/[...route]/page.tsx` (async RSC) + `not-found.tsx` + `error.tsx` (+ `loading.tsx` only if needed)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `index.tsx` (redirect)             | `app/page.tsx` with `export const dynamic = 'force-static'` calling `redirect('/mosaic/index')`; ALSO keep the same redirect in `next.config.js`'s `redirects()` for the dynamic build (export builds use the page, dynamic builds use the manifest)                                                                                                                                                                                                                                                                                                                                                                                                           |
| `api/auth/[...nextauth].ts`        | `app/api/auth/[...nextauth]/route.ts` re-exporting `handlers.GET/POST` from `src/auth.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `api/content/preview.ts`           | Server Action in `app/[...route]/previewAction.ts` (NOT a route handler)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `sitemap.xml.ts` / `robots.txt.ts` | `app/sitemap.ts` / `app/robots.ts` App Router conventions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 404 page                           | `app/not-found.tsx` — fetches root `sharedConfig` + `searchData` via the same `cache()` loaders so the 404 renders with the full chrome                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 500 page                           | `app/error.tsx` (`'use client'`, mandatory) — wraps `<Hero>` from `mosaic-components`, NOT `<Page500>` (the latter hardcodes its strings)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

### 2. Compose loaders directly in `page.tsx`

There is no middleware runner. The page calls the cached loaders in
parallel via `Promise.all`:

```ts
// src/app/[...route]/page.tsx
import { cache } from 'react';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import {
  getMdxRaw,
  getSharedConfig,
  getSearchData,
  getMdxRawSource,
  loadSitemap,
  resolveMosaicMode
} from '@jpmorganchase/mosaic-site-middleware';
import { auth } from '../../auth';
import { StoreShell } from '../providers';
import { BodyServer } from './BodyServer';
// `cache()` so generateMetadata + the page share one resolution.
const resolveRouteInputs = cache(async params => {
  const [{ route = [] }] = await Promise.all([
    params,
    // Skip headers() during snapshot prerender to keep the route static.
    shouldPrerenderSnapshot ? Promise.resolve(undefined) : headers()
  ]);
  const pathname = '/' + route.join('/');
  const { mode, contentUrl } = resolveMosaicMode();
  return { pathname, mode, contentUrl };
});
export default async function RoutePage({ params, searchParams }: PageProps) {
  const { pathname, mode, contentUrl } = await resolveRouteInputs(params);
  const [mdx, sharedConfig, search, sp] = await Promise.all([
    getMdxRaw(pathname, mode, contentUrl),
    getSharedConfig(pathname, mode, contentUrl),
    getSearchData(mode, contentUrl),
    shouldPrerenderSnapshot ? Promise.resolve({}) : searchParams
  ]);
  if (mdx.kind === 'redirect') redirect(mdx.destination);
  if (mdx.kind === 'not-found') notFound();
  // mdx.kind === 'mdx' from here.
  return (
    <StoreShell
      storeProps={{
        ...mdx.frontmatter,
        sharedConfig,
        searchIndex: search.searchIndex,
        searchConfig: search.searchConfig
      }}
    >
      <BodyServer type="mdx" raw={mdx.raw} />
    </StoreShell>
  );
}
```

Key points:

- **Do NOT export `dynamic`** from `app/[...route]/page.tsx`. Let App
  Router infer the mode from `generateStaticParams`: return URLs for
  snapshot prod builds; return `[]` for active and for `next dev` (so
  MDX hot-edits don't get cached). (The simple `app/page.tsx` root
  redirect IS allowed to export `dynamic = 'force-static'` — it has no
  loaders to inhibit.)
- **Cheap-condition-before-await** for `headers()` and `searchParams`:
  awaiting them during a snapshot prerender opts the route out of
  static optimisation.
- `getMdxRaw` returns `{ kind: 'mdx' | 'redirect' | 'not-found' }` —
  the page dispatches on the discriminator. There is no `result.props`
  envelope.
- **Strip `sharedConfig` from frontmatter** before spreading into
  `storeProps` (the loader-derived `sharedConfig` is the enriched
  copy — see the comment block in `packages/site/src/app/[...route]/page.tsx`
  around `_frontmatterSharedConfig`).

### 3. Loader caching is built in

`getMdxRaw`, `getSharedConfig`, `getSearchData`, `getMdxRawSource` are
each wrapped in **two layers**:

1. `cache()` from `react` — request-scoped memoisation (so
   `generateMetadata` and the page render share one read of the same
   args).
2. `unstable_cache()` from `next/cache` — cross-request memoisation
   tagged with `MOSAIC_CONTENT_CACHE_TAG = 'mosaic-content'`.
   To invalidate after a content change, POST to `/api/revalidate` (the
   Mosaic CLI does this automatically when it emits a new snapshot) which
   calls `revalidateTag(MOSAIC_CONTENT_CACHE_TAG, 'max')`. The `'max'`
   second arg is required by Next 16's revalidate API — it's the
   cache-life profile matching "cache until invalidated".
   Dev escape hatch: `MOSAIC_DISABLE_LOADER_CACHE=true` bypasses the
   cross-request layer.

### 4. MDX rendering: serialise on server, render on client

Do **not** render MDX inside the RSC. The pattern is:

```tsx
// app/[...route]/BodyServer.tsx (server component, async)
import { serializeMdxForClient } from '@jpmorganchase/mosaic-site-middleware';
import { MdxRenderer } from './MdxRenderer';
export async function BodyServer({ type, raw }: { type: 'mdx'; raw: string }) {
  if (!raw) throw new Error('BodyServer: `raw` MDX text is required when type === "mdx".');
  const source = await serializeMdxForClient(raw);
  return (
    <div className="wrapper">
      <MdxRenderer source={source} />
    </div>
  );
}
```

```tsx
// app/[...route]/MdxRenderer.tsx ('use client')
'use client';
import { MDXClient } from 'next-mdx-remote-client';
import { mdxComponents } from './MdxComponents';
export function MdxRenderer({ source }) {
  if ('error' in source && source.error) throw source.error; // bubble to error.tsx
  return (
    <MDXClient
      compiledSource={source.compiledSource}
      frontmatter={source.frontmatter}
      scope={source.scope}
      components={mdxComponents}
    />
  );
}
```

`next-mdx-remote-client` (NOT `next-mdx-remote`) is the supported
package. `mdxComponents` is a plain object imported on the client side
so Salt-DS / Mosaic UI components stay in the client graph.

### 5. Provider stack: two layers

`app/providers.tsx` (`'use client'`) exports **both** `Providers` and
`StoreShell`:

```tsx
'use client';
import { useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { StoreProvider, initializeStore, useCreateStore } from '@jpmorganchase/mosaic-store';
// ...
// Mounted by root layout. Persists across navigations. Carries
// SessionProvider + a default-seeded store (for colorMode) + ThemeProvider.
export function Providers({ children }) {
  const createStore = useCreateStore({});
  return (
    <SessionProvider>
      <StoreProvider value={createStore()}>
        <ThemeProvider themeClassName={themeClassName}>{children}</ThemeProvider>
      </StoreProvider>
    </SessionProvider>
  );
}
// Mounted per-route by page.tsx. Creates a FRESH store seeded with
// route-specific data (sharedConfig, frontmatter, search). The nested
// StoreProvider overrides the layout's for everything inside.
export function StoreShell({ storeProps, children }) {
  const [store] = useState(() => initializeStore(storeProps));
  return (
    <StoreProvider value={store}>
      <BaseUrlProvider>
        <ImageProvider value={Image}>
          <LinkProvider value={Link}>
            <LayoutProvider layoutComponents={mosaicLayouts}>{children}</LayoutProvider>
          </LinkProvider>
        </ImageProvider>
      </BaseUrlProvider>
    </StoreProvider>
  );
}
```

**Critical** — three things that are easy to get wrong:

1. **Do NOT pass a server-resolved `session` to `<SessionProvider>`.**
   The reference site deliberately renders it without the `session`
   prop so the client fetches `/api/auth/session` lazily. This keeps
   the root layout independent of Auth.js config: a missing
   `AUTH_SECRET` degrades to `session: null` on the client instead of
   crashing SSR (which would bypass `error.tsx`). Render
   `<SessionProvider>` **unconditionally** — do NOT gate it on a
   server-side `AUTH_ENABLED` flag. `process.env.AUTH_SECRET` is not a
   `NEXT_PUBLIC_` var, so on the client the flag always evaluates to
   `false`, the provider is never mounted, and every `useSession()`
   call (e.g. `AppHeaderControls`, `RouteMetadata`,
   `site-components/Metadata`) throws `[next-auth]: useSession must be wrapped in a <SessionProvider />`. On no-auth deployments the
   server's stub 404 handlers make the lazy fetch settle to `null` —
   that's the correct shape, no gate needed.
2. **Use `initializeStore(seed)` per route, not `useCreateStore`.**
   `useCreateStore` keeps a module-level singleton patched from a
   `useLayoutEffect`, which produces hydration mismatches under App
   Router (SSR has the route seed; first client render reads the
   stale singleton). `initializeStore` returns a fully-populated
   store synchronously, matching SSR exactly.
3. **The layout-level store IS still required.** Even not-found and
   error renders need a store in context for `useColorMode`.

### 6. Static export (`MOSAIC_OUTPUT=export`)

`next.config.js` splits into `baseConfig` / `dynamicOnlyConfig` /
`exportConfig`:

```js
const isExport = process.env.MOSAIC_OUTPUT === 'export';
const mosaicMode = process.env.MOSAIC_MODE || 'active';
if (isExport && !mosaicMode.startsWith('snapshot')) {
  throw new Error(`MOSAIC_OUTPUT=export requires snapshot MOSAIC_MODE (got "${mosaicMode}")`);
}
// exportConfig sets output: 'export', images.unoptimized: true, trailingSlash: false
// dynamicOnlyConfig owns rewrites() + redirects() (both unsupported under export)
module.exports = isExport
  ? { ...baseConfig, ...exportConfig }
  : { ...baseConfig, ...dynamicOnlyConfig };
```

`app/[...route]/page.tsx` uses inferred `dynamic` via
`generateStaticParams`:

```ts
const isSnapshotMode = process.env.MOSAIC_MODE?.startsWith('snapshot') ?? false;
const isProductionBuild = process.env.NODE_ENV === 'production';
const shouldPrerenderSnapshot = isSnapshotMode && isProductionBuild;
export async function generateStaticParams() {
  if (!shouldPrerenderSnapshot) return [];
  const urls = await loadSitemap();
  return urls
    .map(url => url.replace(/^\//, '').split('/').filter(Boolean))
    .filter(s => s.length > 0)
    .map(route => ({ route }));
}
```

**Route handlers AND Server Actions must be stubbed for export.** Next
16's `output: 'export'` collector:

- Refuses `route.ts` unless `export const dynamic = 'force-static'` is
  a **string literal** (a `process.env` ternary fails AST check).
- Does not support `'use server'` modules (Server Actions) at all.
  So we swap them on disk around `next build`. See
  `packages/site/scripts/static-export-route-stubs.mjs` for the full
  list. Today it covers:
- `app/api/auth/[...nextauth]/route.ts` (auth requires server runtime)
- `app/api/content/live/route.ts` (SSE requires long-lived runtime)
- `app/api/revalidate/route.ts` (no server cache in static export)
- `app/[...route]/previewAction.ts` (Server Action)
- `app/[...route]/persistAction.ts` (Server Action)
  The wiring in `package.json`:

```jsonc
"build:static:file": "node scripts/static-export-route-stubs.mjs apply && (yarn cross-env MOSAIC_MODE=snapshot-file MOSAIC_OUTPUT=export next build; status=$?; node scripts/static-export-route-stubs.mjs revert; exit $status)",
"build:static:s3":   "node scripts/static-export-route-stubs.mjs apply && (yarn cross-env MOSAIC_MODE=snapshot-s3 MOSAIC_OUTPUT=export next build; status=$?; node scripts/static-export-route-stubs.mjs revert; exit $status)",
"build:static:revert": "node scripts/static-export-route-stubs.mjs revert"
```

Gitignore the `.bak` files the apply step produces.

### 7. Auth.js v5

`src/auth.ts` is the single source of truth:

```ts
import NextAuth, { type NextAuthResult } from 'next-auth';
const result: NextAuthResult = NextAuth(authConfig);
export const handlers = result.handlers;
export const auth = result.auth; // await auth() in server code
export const signIn = result.signIn;
export const signOut = result.signOut;
```

The `NextAuthResult` type annotations on each export are **required**
so TS can emit `.d.ts` files without an unportable reference into
`node_modules/next-auth/lib`.
`src/app/api/auth/[...nextauth]/route.ts`:

```ts
export { GET, POST } from '../../../../auth'; // re-export handlers
```

Server: `await auth()` everywhere `getServerSession` was used. Client:
`useSession()` from `next-auth/react` still works.
The reference site has an `AUTH_SECRET ?? NEXTAUTH_SECRET` fallback,
`trustHost: true` (required outside Vercel), and a dev-only
`MOSAIC_DEV_FAKE_AUTH=true` Credentials provider for exercising the
editor without configuring OAuth. Both are guarded against
`NODE_ENV === 'production'`.

### 8. Editor branch (`?edit=1`) and create branch (`?new=1`)

The reference site's `page.tsx` has additional branches:

- `?edit=1` mounts `<EditorBody />` (Lexical, lazy-loaded via
  `next/dynamic`) instead of `<BodyServer />`.
- `?new=1` synthesises a blank-page template (see `newPageTemplate.ts`)
  and mounts the editor in create mode.
  Both are gated by:

1. **Auth**: `const session = await auth()` — never ship the editor
   bundle to an unauthenticated client.
2. **Source-capability gate**:
   `sharedConfig?.sourceCapabilities?.writable === true`. Pages owned
   by a non-writable source (e.g. `source-local-folder`) fall through
   to view mode even with `?edit=1` hand-typed. Closed default.
3. **Mode gate**: skip the auth call entirely when
   `shouldPrerenderSnapshot` is true (the editor is unreachable in
   static export anyway).
   Dev escape hatch: `MOSAIC_DEV_BYPASS_CAPABILITY_GATE=true` forces
   `writable = true` in non-production builds (e.g. so e2e tests can run
   against `source-local-folder`).
   Use `getMdxRawSource` (also exported by `mosaic-site-middleware`) for
   the editor's Frontmatter tab — it hits the CLI's `/_mosaic-raw/*`
   endpoint, bypassing the plugin pipeline, and returns a discriminated
   result (`raw` / `not-found` / `no-matching-source` /
   `unsupported-source` / `unavailable-in-mode`) so the UI can render
   precise hints.
   For the create (`?new=1`) branch the page synthesises a `rawSource`
   envelope around the same template bytes the body editor is seeded
   with — `{ kind: 'raw', bytes: newPageRaw, namespace: undefined }` —
   so the Frontmatter tab is immediately editable.
   If `?new=1` is hand-typed against a route that already exists, the
   page redirects to `?edit=1&existed=1` instead of silently clobbering
   on save.

### 9. Eliminate `next/router`

| Old API                                            | App Router replacement                                                                                    |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `useRouter().push`                                 | `useRouter()` from `next/navigation` (`push` API unchanged)                                               |
| `useRouter().asPath` / `pathname`                  | `usePathname()`                                                                                           |
| `useRouter().query`                                | `useSearchParams()`                                                                                       |
| `useRouter().events.on('routeChangeComplete', cb)` | `useEffect(cb, [usePathname()])`                                                                          |
| `useRouter().events.on('routeChangeStart', cb)`    | No direct equivalent. Use `loading.tsx` for spinners; key effects on `usePathname()` for the common cases |

Mark every affected file `'use client'`.

### 10. Dev-only live reload

`app/api/content/live/route.ts` exposes an SSE stream. `app/LiveReload.tsx`
opens an `EventSource` and calls `router.refresh()` on each
`content-changed` event. The `POST /api/revalidate` handler calls
`notifyContentChanged()` (from `lib/liveReloadBus.ts`) to push a
signal — so after a Mosaic CLI snapshot rebuild, every open browser
tab refreshes automatically in dev. Both the SSE route and the
component are gated on `NODE_ENV === 'development'`, and the route
is stubbed out in static export builds.

### 11. Metadata, sitemap, robots

Set `metadataBase` **once** in `app/layout.tsx` from
`NEXT_PUBLIC_SITE_URL` via `resolveSiteOrigin()` (with a localhost
fallback + production warning) so every per-route `generateMetadata`
and `app/sitemap.ts` / `app/robots.ts` produce absolute URLs against
the same origin.
`app/sitemap.ts` uses `loadSitemap()` (same source `generateStaticParams`
uses) and sets `export const revalidate = 0` so active-mode deployments
re-read on every request. Important: **delete any `public/sitemap.xml`**
the snapshot pipeline used to drop — Next refuses to start when a
`public/` file and an `app/` route collide on the same path. The
sitemap convention does NOT honour `metadataBase` automatically, so the
route reads `NEXT_PUBLIC_SITE_URL` directly to emit absolute `<loc>`
URLs.
`app/robots.ts` is `dynamic = 'force-static'` and emits an absolute
`Sitemap:` URL from the same origin source.
Per-route `generateMetadata` should call `getMdxRaw` for the
frontmatter — it shares the request-scoped cache entry with the page
render so the underlying fetch only happens once.

### 12. Things to **not** do

- **Don't** add a `middleware.ts` for redirects. Keep them in
  `next.config.js`'s `redirects()` (dynamic builds) and `app/page.tsx`
  (export builds). A `middleware.ts` would invoke an Edge function on
  every request and would not work under `output: 'export'` at all.
- **Don't** ask for `fromAppRouter`, `runMiddleware`, `compileMdxRsc`,
  `fromPagesRouter`, `createMiddlewareRunner`, or any `with*`
  middleware — none of them exist. Compose the cached loaders
  directly.
- **Don't** import `Document` from `@jpmorganchase/mosaic-site-components`
  — it was removed (transitively pulled `next/document`, which is App
  Router incompatible). Use `app/layout.tsx` directly.
- **Don't** import `useIsLoading` from `@jpmorganchase/mosaic-layouts`
  — it was removed. Use `loading.tsx` for the spinner case.
- **Don't** install `next-mdx-remote`. Use `next-mdx-remote-client`.
- **Don't** pass a server-resolved `session` to `<SessionProvider>`
  (see §5).
- **Don't** export `dynamic` from `app/[...route]/page.tsx`
  (see §6). `app/page.tsx` (root redirect) is fine.
- **Don't** use `useCreateStore` at the per-route layer (see §5).
- **Don't** use `<Page500>` from `mosaic-site-components` for the
  global error boundary — it hardcodes its strings and refuses props.
  Inline `<Hero>` from `mosaic-components` instead (see §1).

### 13. Env var inventory (audit when migrating)

When porting a Pages Router site, **scrub `.env*` files**: Pages Router
deployments accumulated several vars that App Router + Auth.js v5 do
not consume. Run a source-only audit before shipping (excluding
`.next/`, `out/`, `dist/`, `node_modules/`):

```bash
grep -RIn --exclude-dir={node_modules,.next,out,dist,coverage,.turbo,.git} \
  -e MOSAIC_ -e NEXT_PUBLIC_ -e AUTH_SECRET -e NEXTAUTH \
  -e GITHUB_ID -e GITHUB_SECRET packages/site packages/site-middleware
```

**Required by the App Router site:**

| Var                                                         | Read by                                                 | Notes                                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `MOSAIC_MODE`                                               | `next.config.js`, `page.tsx`, middleware loaders        | `active` \| `snapshot-file` \| `snapshot-s3`. Defaults to `active`.              |
| `MOSAIC_ACTIVE_MODE_URL`                                    | `resolveMosaicMode`, `loadSitemap`                      | Required in active mode.                                                         |
| `MOSAIC_SNAPSHOT_DIR`                                       | `getSnapshotFileConfig`                                 | Required in `snapshot-file` mode.                                                |
| `MOSAIC_S3_{BUCKET,REGION,ACCESS_KEY_ID,SECRET_ACCESS_KEY}` | `getSnapshotS3Config`                                   | Required in `snapshot-s3` mode.                                                  |
| `NEXT_PUBLIC_SITE_URL`                                      | `lib/siteOrigin.ts`, `app/sitemap.ts`, `app/layout.tsx` | Drives `metadataBase` + absolute sitemap/robots URLs. Production warns if unset. |
| `NEXT_PUBLIC_OPTIMIZE_IMAGES`                               | `site-components/Image`                                 | Toggle Next image optimisation.                                                  |

**Optional / opt-in:**

| Var                                         | Purpose                                                                                |
| ------------------------------------------- | -------------------------------------------------------------------------------------- |
| `MOSAIC_OUTPUT=export`                      | Static export build (requires snapshot mode).                                          |
| `MOSAIC_AUTH_ENABLED=true`                  | Explicit Auth.js opt-in. Implicitly enabled when `AUTH_SECRET` is set.                 |
| `AUTH_SECRET` (or legacy `NEXTAUTH_SECRET`) | Auth.js v5 secret. Required if auth is enabled.                                        |
| `GITHUB_ID` / `GITHUB_SECRET`               | GitHub OAuth provider.                                                                 |
| `MOSAIC_REVALIDATE_SECRET`                  | Shared secret for `/api/revalidate`. Site fails closed without it.                     |
| `MOSAIC_REVALIDATE_URL`                     | CLI-side: where the `serve` command POSTs revalidate webhooks.                         |
| `MOSAIC_DISABLE_LOADER_CACHE=true`          | Dev: bypass `unstable_cache` layer for hot-edits.                                      |
| `MOSAIC_DEV_FAKE_AUTH=true`                 | Dev: Credentials provider auto-accepts sign-in (gated on `NODE_ENV !== 'production'`). |
| `MOSAIC_DEV_BYPASS_CAPABILITY_GATE=true`    | Dev: force `writable=true` for the editor against non-writable sources.                |
| `NEXT_PUBLIC_ENABLE_LOGIN=true`             | Show the Sign In button in `AppHeaderControls`.                                        |

**Almost certainly stale on a migrated site — DELETE from `.env*`:**

| Var                                   | Why it's stale                                                                                                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXTAUTH_URL`                        | Auth.js **v5** uses `trustHost: true` and infers origin from request headers. Only v4 needed it.                                                                       |
| `MOSAIC_ENABLE_SOURCE_PUSH`           | CLI/source-plugin concern, never read by the site.                                                                                                                     |
| `NEXT_PUBLIC_MOSAIC_IBCE_PREVIEW_URL` | Pages Router preview API path; the App Router uses a Server Action (`previewAction.ts`) and the URL is hardcoded inside the editor plugin.                             |
| `NEXT_PUBLIC_MOSAIC_WORKFLOWS_URL`    | Legacy WebSocket workflow URL; the current editor calls Server Actions instead.                                                                                        |
| `OPTIMIZE_IMAGES` (non-public)        | Only the `NEXT_PUBLIC_` variant is read on the client; the bare version is a duplicate that does nothing.                                                              |
| `SITE_URL`                            | Only used by the Mosaic **CLI's** `sitemap-plugin` during `gen:snapshot` (set it in `.env`, not in the site runtime). The App Router site uses `NEXT_PUBLIC_SITE_URL`. |

**Footgun — looks stale but isn't:**

| Var                    | Why you must keep it                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NODE_ENV=development` | Next.js sets this automatically for its dev server, BUT `mosaic.config.mjs` is also loaded by the **Mosaic CLI** (`yarn serve`, `yarn mosaic serve`) which does NOT auto-set it. The site's `mosaic.config.mjs` gates `sources` on `NODE_ENV === 'development'`; without the env var the CLI starts with every source disabled and serves no content. Keep it in `.env.local`. |

### 14. Verification checklist

```bash
# 1. Type-check
yarn tsc --noEmit
# 2. Unit tests
yarn vitest run
# 3. Production builds across all three modes
for mode in active snapshot-file snapshot-s3; do
  rm -rf .next && MOSAIC_MODE=$mode yarn build || exit 1
done
# 4. Static export (apply → build → revert is one command)
yarn build:static:file
test -f out/index.html && ls packages/site/src/app/**/*.bak 2>/dev/null && echo "FAIL: bak files leaked" || echo "OK"
# 5. Bundle audit — next-mdx-remote (the legacy package) must NOT appear
grep -r "\"next-mdx-remote\"" .next/server/app/ && echo "FAIL" || echo "OK"
# 6. E2E
yarn e2e
```

## Reference files in `packages/site` and `packages/site-middleware`

When in doubt, read these — they are the canonical patterns:
**App Router layer (`packages/site/src/`):**

- `app/layout.tsx` — root layout, metadataBase, FOUC script, dev LiveReload
- `app/providers.tsx` — `Providers` (global) + `StoreShell` (per-route)
- `app/page.tsx` — root redirect (`dynamic = 'force-static'`)
- `app/not-found.tsx` — global 404, calls `resolveMosaicMode` + cached loaders
- `app/NotFoundBody.tsx` — client boundary for the 404 chrome
- `app/error.tsx` — global error boundary (`<Hero>` wrapper, NOT `<Page500>`)
- `app/sitemap.ts` / `app/robots.ts` — App Router metadata conventions
- `app/LiveReload.tsx` — dev-only `EventSource` → `router.refresh()`
- `app/[...route]/page.tsx` — RSC route, parallel loaders, edit/create branches
- `app/[...route]/BodyServer.tsx` — server-side `serializeMdxForClient` call
- `app/[...route]/MdxRenderer.tsx` — client-side `<MDXClient />` wrapper
- `app/[...route]/MdxComponents.ts` — client MDX component registry
- `app/[...route]/EditorBody.tsx` — Lexical editor entry (lazy)
- `app/[...route]/RouteMetadata.tsx` — per-route `<meta>` injection
- `app/[...route]/previewAction.ts` / `persistAction.ts` — Server Actions
- `app/[...route]/newPageTemplate.ts` — `?new=1` blank page template
- `app/api/auth/[...nextauth]/route.ts` — Auth.js re-export
- `app/api/revalidate/route.ts` — `revalidateTag(..., 'max')` webhook
- `app/api/content/live/route.ts` — dev SSE for LiveReload
- `auth.ts` — Auth.js v5 wiring (with typed re-exports for `.d.ts` emit)
- `lib/siteOrigin.ts` / `lib/liveReloadBus.ts` — shared helpers
- `next.config.js` — three-config split for export
- `scripts/static-export-route-stubs.mjs` — apply/revert swap for export builds
  **Middleware layer (`packages/site-middleware/src/`):**
- `index.ts` — public re-exports (the entire supported surface)
- `cachedLoaders.ts` — `getMdxRaw`, `getMdxRawSource`, `getSharedConfig`, `getSearchData`, `MOSAIC_CONTENT_CACHE_TAG`
- `serializeMdxForClient.ts` — server-side MDX compile (auto-injects `scope.meta`, recovers error location)
- `loadSitemap.ts` — sitemap reader + `resolveMosaicMode` env helper
- `loaders/` — per-mode primitives (`createS3Loader`, snapshot config, local file)
