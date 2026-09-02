# @jpmorganchase/mosaic-icons

## 1.0.0-beta.99

### Patch Changes

- 0c4d822: Migrate the Mosaic site from Next.js Pages Router to App Router (React Server Components, Auth.js v5, server-rendered MDX, optional static export)

  ## What changed

  The reference Mosaic site (`@jpmorganchase/mosaic-site`) and the shared
  packages it depends on have been ported from the Next.js Pages Router to
  the App Router. Pages-Router-only APIs in the shared packages have been
  removed, and a new static-export build target has been added.

  ### Breaking changes

  **`@jpmorganchase/mosaic-site-middleware` — major**

  - **`fromGetServerSidePropsContext` / `fromPagesRouter` adapter removed.**
    The package no longer ships an adapter for `GetServerSidePropsContext`.
    The router-agnostic `runMiddleware` + `fromAppRouter` API is now the
    only public entry point. Site code that previously called
    `createMiddlewareRunner(...)(ctx, options)` from `getServerSideProps`
    should be rewritten as:

    ```ts
    // src/app/[...route]/page.tsx
    import { headers } from 'next/headers';
    import { fromAppRouter, runMiddleware } from '@jpmorganchase/mosaic-site-middleware';

    const [{ route }, hdrs] = await Promise.all([params, headers()]);
    const ctx = fromAppRouter({ pathname: '/' + route.join('/'), headers: hdrs });
    const result = await runMiddleware(ctx, [withMosaicMode, withMDXContent, ...]);
    ```

    `createMiddlewareRunner` is retained as an internal helper used by the
    `with*` middleware bodies; do not call it directly from site code.

  - **MDX is no longer serialised via `next-mdx-remote`.** Reader pages
    compile MDX server-side with the new `compileMdxRsc(source, { scope, components })` helper, which returns a `JSX.Element` you can render
    directly inside a Server Component. `compileMdx` (used by the editor's
    preview API) is now backed by `next-mdx-remote-client/serialize` —
    output shape is unchanged.

  - **New exports:** `runMiddleware`, `fromAppRouter`,
    `MosaicRequestContext`, `MosaicMiddlewareV2`, `compileMdxRsc`,
    `loadSitemap`, `serializeMdxForClient`, `cachedLoaders`.

  **`@jpmorganchase/mosaic-site-components` — major**

  - **`Body` removed.** The legacy `next-mdx-remote`-based renderer is
    gone. Sites compose their own `BodyServer.tsx` (RSC, calls
    `compileMdxRsc`) and `BodyClient.ts` (`'use client'` boundary). See
    `packages/site/src/app/[...route]/BodyServer.tsx` for the reference
    implementation.

  - **`Document` removed.** App Router has no `_document.tsx`; the file
    was transitively pulling `next/document` and breaking App Router
    builds. Inline what you need into your `app/layout.tsx`.

  - **Subpath exports widened** (`./*`) so consumers can deep-import
    individual modules (e.g.
    `@jpmorganchase/mosaic-site-components/Metadata`) without paying for
    the full bundle. Recommended for any import that previously pulled
    Salt DS or other client-only modules into a server graph.

  **`@jpmorganchase/mosaic-layouts` — major**

  - **`useIsLoading` hook removed.** App Router's `loading.tsx` covers the
    spinner case for free; `router.events` no longer exists.
  - **`Fade` component removed** (was only consumed by `LayoutBase` via
    `useIsLoading`).
  - **`Edit` layout** now keys its "stop editing on navigation" effect on
    `usePathname()` rather than `router.events.routeChangeStart`.

  ### Non-breaking additions

  **`@jpmorganchase/mosaic-site` — major (App Router cut-over)**

  - New file tree under `src/app/` (`layout.tsx`, `providers.tsx`,
    `[...route]/page.tsx`, `not-found.tsx`, `error.tsx`, `loading.tsx`,
    `robots.ts`, `sitemap.ts`, `api/auth/[...nextauth]/route.ts`,
    `api/content/preview/route.ts`, `api/revalidate/route.ts`).
  - **Auth.js v5** wiring in `src/auth.ts` (`handlers`, `auth`, `signIn`,
    `signOut`). Replaces `next-auth` v4. `AUTH_SECRET` is now required;
    `NEXTAUTH_SECRET` continues to work as a fallback for the migration
    window.
  - **Static-export build target.** `yarn build:static:file` and
    `yarn build:static:s3` produce a fully-static `out/` directory
    servable from any CDN with no Node runtime. Gated behind
    `MOSAIC_OUTPUT=export` and a snapshot mode.
  - **`next.config.js`** refactored into `baseConfig` / `dynamicOnlyConfig`
    / `exportConfig`.
  - **`next-mdx-remote` dropped** from the runtime bundle. Production HTML
    for a typical MDX page contains rendered HTML, not a JSON
    `compiledSource` blob. The editor's in-browser preview still uses
    `next-mdx-remote-client` but it is loaded via `next/dynamic({ ssr: false })` so non-editor readers never pay for it.

  **`@jpmorganchase/mosaic-cli` — patch**

  - New `revalidateNotifier`: when `MOSAIC_REVALIDATE_URL` and
    `MOSAIC_REVALIDATE_SECRET` are set, the CLI's `serve` command POSTs to
    the site's `/api/revalidate` whenever a source emits an update, so
    tagged ISR caches are flushed automatically. No-op when the env vars
    are absent — fully backwards-compatible.

  ## Benefits

  ### Performance

  - **Smaller client bundles.** `next-mdx-remote` (and its
    `compiledSource` JSON blob) is no longer shipped to readers. Pages
    render as plain HTML on the server. Spot-check on a typical doc
    route: the response is ~48% smaller end-to-end vs the Pages Router
    build with the full chrome attached.
  - **Streaming RSC.** The catch-all route is an `async` Server
    Component, so the shell streams while middleware runs and MDX
    compiles.
  - **Parallel data resolution.** Route metadata, frontmatter, sitemap,
    and search index are resolved in parallel via the new `cachedLoaders`
    module rather than serially through `getServerSideProps`.
  - **Static export.** Snapshot-mode sites can now be pre-rendered to a
    flat `out/` directory and served from a CDN with no Node runtime,
    reducing per-request latency to whatever the edge can do.

  ### Architecture

  - **Router-agnostic middleware.** `MosaicRequestContext` /
    `runMiddleware` decouple the middleware chain from
    `GetServerSidePropsContext`. The same chain runs in App Router RSCs,
    route handlers, and plain Node tests with no shims.
  - **No more header-as-signalling.** `mode` and `contentUrl` are
    resolved up-front and carried explicitly on the context, replacing
    the previous pattern of writing `X-Mosaic-*` response headers in one
    middleware and reading them back in another.
  - **Discriminated return type.** `runMiddleware` returns
    `{ kind: 'props' | 'redirect' | 'not-found' | 'error', ... }` instead
    of the implicit `GetServerSideProps` return shape, so route code
    pattern-matches explicitly on each outcome.
  - **Single provider boundary.** All client-side providers (Salt theme,
    Mosaic store, Auth.js session, layout/image/link providers) are
    mounted in one `app/providers.tsx` — the rest of the app stays
    server-side by default.

  ### Developer experience

  - **`loading.tsx` / `error.tsx` / `not-found.tsx`** replace
    `router.events`-driven spinners and inline error rendering. Less
    bespoke UI code.
  - **Auth.js v5 `auth()`** works uniformly in RSCs, route handlers, and
    server actions — no more `getServerSession(req, res, opts)` plumbing.
  - **`next-mdx-remote-client`** retained for editor preview, lazy-loaded
    behind `next/dynamic({ ssr: false })`, so the editor still gets
    client-side MDX compilation without polluting the reader bundle.

  ### Operational

  - **Static export option** unlocks CDN-only deployments (S3 +
    CloudFront, Cloudflare Pages, Vercel static, nginx behind anything).
    A reference Docker image lives at `examples/docker/static-export/`
    (Node 20 builder → nginx 1.27 runtime, no Node in the production
    image).
  - **Revalidate notifier** keeps active-mode sites' caches fresh
    automatically when sources push updates, instead of relying on TTL
    expiry.
  - **Node 20** across all in-repo Dockerfiles (Node 18 was EOL and
    doesn't fully support Next 16 + React 19).

  ## Migration guide

  Sites still on the Pages Router should follow the
  `mosaic-pages-to-app-router` recipe. The headline steps:

  1. Replace `pages/_app.tsx` with `app/layout.tsx` + `app/providers.tsx`
     (`'use client'`).
  2. Replace `pages/[...route].tsx` with `app/[...route]/page.tsx`, using
     `fromAppRouter` + `runMiddleware`.
  3. **Seed the Auth.js session in `layout.tsx`** with `await auth()` and
     pass it to `<SessionProvider session={...}>` — an unseeded provider
     races React's dispatcher during parallel SSG and produces a
     non-deterministic `null.useState` crash.
  4. Replace every `from 'next/router'` import with `next/navigation` and
     mark the file `'use client'`.
  5. Convert `pages/api/*.ts` to `app/api/*/route.ts`.
  6. Add `AUTH_SECRET` to your env (Auth.js v5 hard-requires it).

  For static-export deployments, see
  `docs/configure/modes/static-export.mdx`.

  ## Verification

  - **226 unit tests passing** across `packages/site-middleware`,
    `packages/cli`, `packages/plugins`, `packages/core`, and the source
    packages (migration-relevant subset: 18/18 green; pre-existing
    failures in unrelated suites are tracked separately).
  - **195 Playwright e2e cases passing** across chromium, firefox, and
    webkit, including 4 new `app-router.test.ts` cases that lock in: RSC
    HTML output (no `compiledSource` blob), Auth.js providers endpoint,
    Auth.js session endpoint, and the content preview API.
  - **Static export builds cleanly** — 1033 files, 89 pre-rendered pages,
    no `next-mdx-remote` anywhere in the output, no leaked `.bak` files
    from the route-stub apply/revert script.
  - **6 consecutive `next build` runs** (3 active, 3 snapshot-file) all
    completed without the non-deterministic `null.useState` SSG-race
    crash that initially blocked the cut-over (fix: seed the session in
    the root layout, see migration guide step 3).

## 0.1.0-beta.98

### Patch Changes

- b78c699: Update Salt dependencies
- Updated dependencies [b78c699]
  - @jpmorganchase/mosaic-theme@0.1.0-beta.98

## 0.1.0-beta.97

### Patch Changes

- @jpmorganchase/mosaic-theme@0.1.0-beta.97

## 0.1.0-beta.96

### Patch Changes

- @jpmorganchase/mosaic-theme@0.1.0-beta.96

## 0.1.0-beta.95

### Patch Changes

- 18bdd6a: Modernise the build and remove un-used site generator

  - update yarn to 4.10.3
  - pip dependencies to allow for internal JPM build
  - removed `create-site` as un-used, `site` directory can be copied, refer to docs for more details
  - remove packages `@mosaicjs/create-site` and `@jpmorganchase/mosaic-standard-generator` as they are no longer needed
  - `fsconfig.js` has moved from `@jpmorganchase/mosaic-standard-generator` to `@jpmorganchase/mosaic-cli`

  ```diff
  - import mosaicConfig from '@jpmorganchase/mosaic-standard-generator/dist/fs.config.js';
  + import mosaicConfig from '@jpmorganchase/mosaic-cli/fs.config.js';
  ```

- Updated dependencies [18bdd6a]
  - @jpmorganchase/mosaic-theme@0.1.0-beta.95

## 0.1.0-beta.94

### Patch Changes

- @jpmorganchase/mosaic-theme@0.1.0-beta.94

## 0.1.0-beta.93

### Patch Changes

- @jpmorganchase/mosaic-theme@0.1.0-beta.93

## 0.1.0-beta.92

### Patch Changes

- c5b7a75c: Pip Salt and re-align to Salt theme

  Mosaic was initially developed as an internal documentation tool when the Salt Design System lacked several components necessary for building a comprehensive documentation site. Currently, Salt utilizes Mosaic for its documentation, but there are redundancies in themes and components, along with inconsistencies in design standards.

  In this release, we are beginning the process of phasing out the Mosaic theme and eliminating duplicated components, opting instead to use Salt's components directly. This update includes the latest Salt dependencies and initiates the replacement of Mosaic components with their Salt counterparts. Additionally, we are removing the Mosaic-specific theme, aiming to make the site customizable through the Salt theme in the future.

  Key Changes:

  Markdown headings and code styles are now sourced from Salt.
  The Prism code highlighter has been replaced with Shiki.
  The Tile component has been refactored to utilize Salt's Card-based solution.
  The TileLink component has been refactored.
  The Card component has been swapped for Salt's Card.
  This update is largely non-breaking. However, changes are required in the documentation for Tiles and Cards, which now utilize Salt's Grid layout. This necessitates defining columns and rows:

  ```diff
  - <Tiles>
  - </Tiles>
  + <Tiles columns={4} rows={1}>
  + <Tiles>
  ```

  If your documentation includes these components, updating the values will resolve any sizing issues. Otherwise, they will default to 12 columns, which may be too narrow.

- Updated dependencies [c5b7a75c]
  - @jpmorganchase/mosaic-theme@0.1.0-beta.92

## 0.1.0-beta.91

### Patch Changes

- @jpmorganchase/mosaic-theme@0.1.0-beta.91

## 0.1.0-beta.90

### Patch Changes

- @jpmorganchase/mosaic-theme@0.1.0-beta.90
