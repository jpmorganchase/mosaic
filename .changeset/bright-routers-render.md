---
'@jpmorganchase/mosaic-site-middleware': major
'@jpmorganchase/mosaic-site-components': major
'@jpmorganchase/mosaic-layouts': major
'@jpmorganchase/mosaic-content-editor-plugin': patch
'@jpmorganchase/mosaic-sitemap-component': patch
'@jpmorganchase/mosaic-site-preset-styles': patch
'@jpmorganchase/mosaic-open-api-component': patch
'@jpmorganchase/mosaic-source-storybook': patch
'@jpmorganchase/mosaic-source-local-folder': patch
'@jpmorganchase/mosaic-from-http-request': patch
'@jpmorganchase/mosaic-source-git-repo': patch
'@jpmorganchase/mosaic-source-readme': patch
'@jpmorganchase/mosaic-source-figma': patch
'@jpmorganchase/mosaic-source-http': patch
'@jpmorganchase/mosaic-serialisers': patch
'@jpmorganchase/mosaic-components': patch
'@jpmorganchase/mosaic-workflows': patch
'@jpmorganchase/mosaic-schemas': patch
'@jpmorganchase/mosaic-plugins': patch
'@jpmorganchase/mosaic-icons': patch
'@jpmorganchase/mosaic-types': patch
'@jpmorganchase/mosaic-store': patch
'@jpmorganchase/mosaic-theme': patch
'@jpmorganchase/mosaic-core': patch
'@jpmorganchase/mosaic-cli': patch
---

Migrate the Mosaic site from Next.js Pages Router to App Router (React Server Components, Auth.js v5, server-compiled MDX, optional static export)

## What changed

The reference Mosaic site (`@jpmorganchase/mosaic-site`) and the shared
packages it depends on have been ported from the Next.js Pages Router to
the App Router. Pages-Router-only APIs in the shared packages have been
removed, and a new static-export build target has been added.

### Breaking changes

**`@jpmorganchase/mosaic-site-middleware` — major**

- **The Pages Router middleware chain is removed.** `withMosaicMode`,
  `withMDXContent`, `withSharedConfig`, `withSearchIndex`, `withSession`,
  `middlewarePresets`, `createMiddlewareRunner` and the
  `fromGetServerSidePropsContext` adapter are gone.
- **Replaced by cached loaders** that App Router routes call directly
  (in parallel): `getMdxRaw`, `getSharedConfig`, `getSearchData`,
  `getMdxRawSource`, `getTagSuggestions`, `loadSitemap` and
  `resolveMosaicMode`. Each is deduplicated per request with
  `React.cache` and cached across requests with `unstable_cache`, tagged
  `MOSAIC_CONTENT_CACHE_TAG` (also exported from the side-effect-free
  `@jpmorganchase/mosaic-site-middleware/cache-tags` subpath).
- **MDX is compiled with `serializeMdxForClient`** (built on
  `next-mdx-remote-client/serialize`, with server-side shiki
  highlighting). It returns a JSON-safe `{ compiledSource, frontmatter, scope }` payload that a client `<MDXClient />` renders.

**`@jpmorganchase/mosaic-site-components` — major**

- **`Body` removed.** Render MDX with a renderer from
  `createMdxRenderer({ components })` fed by `serializeMdxForClient`.
  See `packages/site/src/app/[...route]/BodyServer.tsx` and
  `MdxComponents.ts` for the reference implementation.
- **`Document` removed.** App Router has no `_document.tsx`; the file
  was transitively pulling `next/document` and breaking App Router
  builds. Inline what you need into your `app/layout.tsx`.
- **Subpath exports widened** (`./*`) so consumers can deep-import
  individual modules (e.g.
  `@jpmorganchase/mosaic-site-components/Metadata`) without paying for
  the full bundle.

**`@jpmorganchase/mosaic-layouts` — major**

- **`useIsLoading` hook removed.** `router.events` no longer exists in
  the App Router.
- **`Fade` component removed** (was only consumed by `LayoutBase` via
  `useIsLoading`).
- **`Edit` layout** is selected by `LayoutProvider` from the edit mode
  instead of reacting to `router.events.routeChangeStart`.

### Non-breaking additions

**`@jpmorganchase/mosaic-site` (App Router cut-over)**

- New file tree under `src/app/` (`layout.tsx`, `providers.tsx`,
  `[...route]/page.tsx`, `not-found.tsx`, `error.tsx`, `robots.ts`,
  `sitemap.ts`, `api/auth/[...nextauth]/route.ts`,
  `api/revalidate/route.ts`).
- The editor's preview compile and save are Server Actions
  (`previewAction.ts`, `persistAction.ts`), replacing the
  `/api/content/preview` route and the browser-side workflows WebSocket.
- **Auth.js v5** wiring in `src/auth.ts` (`handlers`, `auth`, `signIn`,
  `signOut`), replacing `next-auth` v4. `AUTH_SECRET` is required when
  auth is enabled; `NEXTAUTH_SECRET` continues to work as a fallback.
- **Static-export build target.** `yarn build:static:file` and
  `yarn build:static:s3` produce a fully-static `out/` directory
  servable from any CDN with no Node runtime. Gated behind
  `MOSAIC_OUTPUT=export` and a snapshot mode.
- **`next.config.js`** refactored into `baseConfig` / `dynamicOnlyConfig`
  / `exportConfig`.

**`@jpmorganchase/mosaic-cli` — patch**

- New `revalidateNotifier`: when `MOSAIC_REVALIDATE_URL` and
  `MOSAIC_REVALIDATE_SECRET` are set, the CLI's `serve` command POSTs to
  the site's `/api/revalidate` whenever a source emits an update, so
  tagged caches are flushed automatically. No-op when the env vars are
  absent.

## Benefits

- **Parallel data loading.** Frontmatter, shared config and the search
  index are resolved in parallel rather than serially through
  `getServerSideProps`, and identical reads collapse onto one fetch.
- **Server-side MDX work.** Parsing, compiling and syntax highlighting
  run on the server; the browser only evaluates the compiled page.
- **Static export** unlocks CDN-only deployments (S3 + CloudFront,
  nginx, …). A reference Docker image lives at
  `examples/docker/static-export/`.
- **Revalidate notifier** keeps sites' caches fresh when sources push
  updates.
- **Node 24** across all in-repo Dockerfiles.

## Migration guide

1. Replace `pages/_app.tsx` with `app/layout.tsx` + `app/providers.tsx`
   (`'use client'`). Mount `<SessionProvider>` without a server-resolved
   session.
2. Replace `pages/[...route].tsx` with `app/[...route]/page.tsx`, calling
   the `@jpmorganchase/mosaic-site-middleware` loaders.
3. Replace every `from 'next/router'` import with `next/navigation` and
   mark the file `'use client'`.
4. Convert `pages/api/*.ts` to `app/api/*/route.ts`.
5. Add `AUTH_SECRET` to your env if you enable Auth.js.

The full guide, including environment variable and CLI changes, is in
`docs/getting-started/migrate-to-app-router.mdx`.

For static-export deployments, see
`docs/configure/modes/static-export.mdx`.
