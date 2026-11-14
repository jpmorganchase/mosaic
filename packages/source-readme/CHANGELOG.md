# @jpmorganchase/mosaic-source-readme

## 1.0.0-beta.99

### Patch Changes

- 0c4d822: Migrate the Mosaic site from Next.js Pages Router to App Router (React Server Components, Auth.js v5, server-compiled MDX, optional static export)
  
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
  - **Static-export build target.** `yarn build:static:file` produces a
    fully-static `out/` directory servable from any CDN with no Node
    runtime. Gated behind `MOSAIC_OUTPUT=export` and
    `MOSAIC_MODE=snapshot-file`.
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
- 915b9ae: Fix request timeouts, background work that failed silently, snapshot cleanup, and editor capability spoofing
  
  - **`requestTimeout` now works** for the HTTP, Readme, Storybook and Figma
    sources. rxjs `fromFetch` replaced the Request's own abort signal, so the
    timeout was ignored and a hung endpoint stalled the source. `fromHttpRequest`
    takes a new `{ timeout }` option. It starts a fresh timer for every request,
    including each scheduled poll, and covers reading the response body.
  - **Symlinks are applied before the source update continues.** Core no longer
    starts symlink creation without awaiting it, so `afterUpdate` plugins see
    every alias, and a failure is reported for that source instead of crashing
    the process with an unhandled rejection.
  - **`BrokenLinksPlugin`** still checks links in the background, but checks at
    most four pages at a time. A page that fails to parse or check is logged
    instead of causing an unhandled rejection.
  - **`mosaic build`** now empties the snapshot folder completely. Previously
    sub-folders were never removed, so deleted or renamed pages lingered. A
    `--name` that resolves to the output directory itself or outside it (for
    example `.` or `../x`) is rejected, because that folder is emptied.
  - **`StickyHeader`** removes its scroll listener on unmount.
  - **Editor capabilities come only from the source.** Content could turn on the
    editor for a source that doesn't declare `writable`, either by setting
    `sourceCapabilities` or `sharedConfig.sourceCapabilities` in frontmatter,
    by pulling one in with a `$ref`, or by receiving another source's namespace
    shared config. Core and the site ignore capabilities in page frontmatter.
    The `SharedConfigPlugin` now sets `sourceCapabilities` in every
    `shared-config.json` from the source's declared capabilities after refs are
    resolved, and no longer copies them into another source.
- 2a2f07e: Update dependencies with security fixes: `fastify` 5.12.8, `@fastify/middie` 9.3.6, `undici` 8.12.4, `swagger-ui-react` 5.34.1 and `@apidevtools/json-schema-ref-parser` 16.
- Updated dependencies [b581d8b]
- Updated dependencies [0c4d822]
- Updated dependencies [915b9ae]
- Updated dependencies [5476067]
- Updated dependencies [2a2f07e]
- Updated dependencies [168391e]
- Updated dependencies [41e8af3]
- Updated dependencies [5d69155]
  - @jpmorganchase/mosaic-types@1.0.0-beta.99
  - @jpmorganchase/mosaic-source-http@1.0.0-beta.99
  - @jpmorganchase/mosaic-schemas@1.0.0-beta.99

## 0.1.0-beta.98

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.98
- @jpmorganchase/mosaic-source-http@0.1.0-beta.98
- @jpmorganchase/mosaic-types@0.1.0-beta.98

## 0.1.0-beta.97

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.97
- @jpmorganchase/mosaic-source-http@0.1.0-beta.97
- @jpmorganchase/mosaic-types@0.1.0-beta.97

## 0.1.0-beta.96

### Patch Changes

- ce408d6: Improve error handling

  Improve error handling of `fromHTTPRequest` and `createHttpSource`.
  An object is now returned providing the successful responses and also an error for each failed request.
  This enables you to process the error in your Source but also fixes an issue where, one bad request would
  drop all the other successful responses.

- 5e42846: Improved logging by standardizing the prefix
- Updated dependencies [ce408d6]
- Updated dependencies [5e42846]
  - @jpmorganchase/mosaic-source-http@0.1.0-beta.96
  - @jpmorganchase/mosaic-types@0.1.0-beta.96
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.96

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

  - @jpmorganchase/mosaic-schemas@0.1.0-beta.95
  - @jpmorganchase/mosaic-source-http@0.1.0-beta.95
  - @jpmorganchase/mosaic-types@0.1.0-beta.95

## 0.1.0-beta.94

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.94
- @jpmorganchase/mosaic-source-http@0.1.0-beta.94
- @jpmorganchase/mosaic-types@0.1.0-beta.94

## 0.1.0-beta.93

### Patch Changes

- 699e570b: Refactored to remove node-fetch.
- Updated dependencies [699e570b]
  - @jpmorganchase/mosaic-source-http@0.1.0-beta.93
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.93
  - @jpmorganchase/mosaic-types@0.1.0-beta.93

## 0.1.0-beta.92

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.92
- @jpmorganchase/mosaic-source-http@0.1.0-beta.92
- @jpmorganchase/mosaic-types@0.1.0-beta.92

## 0.1.0-beta.91

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.91
- @jpmorganchase/mosaic-source-http@0.1.0-beta.91
- @jpmorganchase/mosaic-types@0.1.0-beta.91

## 0.1.0-beta.90

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.90
- @jpmorganchase/mosaic-source-http@0.1.0-beta.90
- @jpmorganchase/mosaic-types@0.1.0-beta.90

## 0.1.0-beta.89

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.89
- @jpmorganchase/mosaic-source-http@0.1.0-beta.89
- @jpmorganchase/mosaic-types@0.1.0-beta.89

## 0.1.0-beta.88

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.88
- @jpmorganchase/mosaic-source-http@0.1.0-beta.88
- @jpmorganchase/mosaic-types@0.1.0-beta.88

## 0.1.0-beta.87

### Patch Changes

- Updated dependencies [14942195]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.87
  - @jpmorganchase/mosaic-source-http@0.1.0-beta.87
  - @jpmorganchase/mosaic-types@0.1.0-beta.87

## 0.1.0-beta.86

### Patch Changes

- Updated dependencies [b8361977]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.86
  - @jpmorganchase/mosaic-types@0.1.0-beta.86
  - @jpmorganchase/mosaic-source-http@0.1.0-beta.86

## 0.1.0-beta.85

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.85
- @jpmorganchase/mosaic-source-http@0.1.0-beta.85
- @jpmorganchase/mosaic-types@0.1.0-beta.85

## 0.1.0-beta.84

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.84
- @jpmorganchase/mosaic-source-http@0.1.0-beta.84
- @jpmorganchase/mosaic-types@0.1.0-beta.84

## 0.1.0-beta.83

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.83
- @jpmorganchase/mosaic-source-http@0.1.0-beta.83
- @jpmorganchase/mosaic-types@0.1.0-beta.83

## 0.1.0-beta.82

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.82
- @jpmorganchase/mosaic-source-http@0.1.0-beta.82
- @jpmorganchase/mosaic-types@0.1.0-beta.82

## 0.1.0-beta.81

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.81
- @jpmorganchase/mosaic-source-http@0.1.0-beta.81
- @jpmorganchase/mosaic-types@0.1.0-beta.81

## 0.1.0-beta.80

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.80
- @jpmorganchase/mosaic-source-http@0.1.0-beta.80
- @jpmorganchase/mosaic-types@0.1.0-beta.80

## 0.1.0-beta.79

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.79
- @jpmorganchase/mosaic-source-http@0.1.0-beta.79
- @jpmorganchase/mosaic-types@0.1.0-beta.79

## 0.1.0-beta.78

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.78
- @jpmorganchase/mosaic-source-http@0.1.0-beta.78
- @jpmorganchase/mosaic-types@0.1.0-beta.78

## 0.1.0-beta.77

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.77
- @jpmorganchase/mosaic-source-http@0.1.0-beta.77
- @jpmorganchase/mosaic-types@0.1.0-beta.77

## 0.1.0-beta.76

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.76
- @jpmorganchase/mosaic-source-http@0.1.0-beta.76
- @jpmorganchase/mosaic-types@0.1.0-beta.76

## 0.1.0-beta.75

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.75
- @jpmorganchase/mosaic-source-http@0.1.0-beta.75
- @jpmorganchase/mosaic-types@0.1.0-beta.75

## 0.1.0-beta.74

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.74
- @jpmorganchase/mosaic-source-http@0.1.0-beta.74
- @jpmorganchase/mosaic-types@0.1.0-beta.74

## 0.1.0-beta.73

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.73
- @jpmorganchase/mosaic-source-http@0.1.0-beta.73
- @jpmorganchase/mosaic-types@0.1.0-beta.73

## 0.1.0-beta.72

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.72
- @jpmorganchase/mosaic-source-http@0.1.0-beta.72
- @jpmorganchase/mosaic-types@0.1.0-beta.72

## 0.1.0-beta.71

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.71
- @jpmorganchase/mosaic-source-http@0.1.0-beta.71
- @jpmorganchase/mosaic-types@0.1.0-beta.71

## 0.1.0-beta.70

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.70
- @jpmorganchase/mosaic-source-http@0.1.0-beta.70
- @jpmorganchase/mosaic-types@0.1.0-beta.70

## 0.1.0-beta.69

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.69
- @jpmorganchase/mosaic-source-http@0.1.0-beta.69
- @jpmorganchase/mosaic-types@0.1.0-beta.69

## 0.1.0-beta.68

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.68
- @jpmorganchase/mosaic-source-http@0.1.0-beta.68
- @jpmorganchase/mosaic-types@0.1.0-beta.68

## 0.1.0-beta.67

### Patch Changes

- 30e2f038: Align source APIs for Figma, Storybook and Readme

  Updates to related sources so that have consistent APIs.

  - `tags` is now visible in the `meta`, previously deleted
  - use `meta.tags` rather than rely on a CSV copy in `meta.data.tags`
  - move un-neccessary `meta.data` to config (e.g `source`)
  - removed `additionalTags` and `additionalData` from Storybook source and use `meta` instead
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.67
  - @jpmorganchase/mosaic-source-http@0.1.0-beta.67
  - @jpmorganchase/mosaic-types@0.1.0-beta.67

## 0.1.0-beta.66

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.66
- @jpmorganchase/mosaic-source-http@0.1.0-beta.66
- @jpmorganchase/mosaic-types@0.1.0-beta.66

## 0.1.0-beta.65

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.65
- @jpmorganchase/mosaic-source-http@0.1.0-beta.65
- @jpmorganchase/mosaic-types@0.1.0-beta.65

## 0.1.0-beta.64

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.64
- @jpmorganchase/mosaic-source-http@0.1.0-beta.64
- @jpmorganchase/mosaic-types@0.1.0-beta.64

## 0.1.0-beta.63

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.63
- @jpmorganchase/mosaic-source-http@0.1.0-beta.63
- @jpmorganchase/mosaic-types@0.1.0-beta.63

## 0.1.0-beta.62

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.62
- @jpmorganchase/mosaic-source-http@0.1.0-beta.62
- @jpmorganchase/mosaic-types@0.1.0-beta.62

## 0.1.0-beta.61

### Patch Changes

- cec89401: add `pluginTimeout` (20 secs) to fastify to prevent loading timeout
- Updated dependencies [cec89401]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.61
  - @jpmorganchase/mosaic-source-http@0.1.0-beta.61
  - @jpmorganchase/mosaic-types@0.1.0-beta.61

## 0.1.0-beta.60

### Patch Changes

- a3da0830: New Readme Source

  This source pulls a single Readme.md from a remote Source repo.
  Typically used for third-party repos which exist already or don't want to
  create a full document hierachy and use `@jpmorganchase/mosaic-source-git-repo`.
  By pulling a single page, we can add metadata to that page via the source's config.
  It's also more performant as we do not need to pull a whole source repo.

- Updated dependencies [a3da0830]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.60
  - @jpmorganchase/mosaic-source-http@0.1.0-beta.60
  - @jpmorganchase/mosaic-types@0.1.0-beta.60
