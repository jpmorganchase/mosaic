# @jpmorganchase/mosaic-source-http

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
  - @jpmorganchase/mosaic-from-http-request@1.0.0-beta.99
  - @jpmorganchase/mosaic-schemas@1.0.0-beta.99

## 0.1.0-beta.98

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.98
- @jpmorganchase/mosaic-schemas@0.1.0-beta.98
- @jpmorganchase/mosaic-types@0.1.0-beta.98

## 0.1.0-beta.97

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.97
- @jpmorganchase/mosaic-schemas@0.1.0-beta.97
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
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.96
  - @jpmorganchase/mosaic-types@0.1.0-beta.96
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.96

## 0.1.0-beta.95

### Patch Changes

- Updated dependencies [18bdd6a]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.95
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.95
  - @jpmorganchase/mosaic-types@0.1.0-beta.95

## 0.1.0-beta.94

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.94
- @jpmorganchase/mosaic-schemas@0.1.0-beta.94
- @jpmorganchase/mosaic-types@0.1.0-beta.94

## 0.1.0-beta.93

### Patch Changes

- 699e570b: Refactored to remove node-fetch.
- Updated dependencies [699e570b]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.93
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.93
  - @jpmorganchase/mosaic-types@0.1.0-beta.93

## 0.1.0-beta.92

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.92
- @jpmorganchase/mosaic-schemas@0.1.0-beta.92
- @jpmorganchase/mosaic-types@0.1.0-beta.92

## 0.1.0-beta.91

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.91
- @jpmorganchase/mosaic-schemas@0.1.0-beta.91
- @jpmorganchase/mosaic-types@0.1.0-beta.91

## 0.1.0-beta.90

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.90
- @jpmorganchase/mosaic-schemas@0.1.0-beta.90
- @jpmorganchase/mosaic-types@0.1.0-beta.90

## 0.1.0-beta.89

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.89
- @jpmorganchase/mosaic-schemas@0.1.0-beta.89
- @jpmorganchase/mosaic-types@0.1.0-beta.89

## 0.1.0-beta.88

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.88
- @jpmorganchase/mosaic-schemas@0.1.0-beta.88
- @jpmorganchase/mosaic-types@0.1.0-beta.88

## 0.1.0-beta.87

### Patch Changes

- Updated dependencies [14942195]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.87
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.87
  - @jpmorganchase/mosaic-types@0.1.0-beta.87

## 0.1.0-beta.86

### Patch Changes

- Updated dependencies [b8361977]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.86
  - @jpmorganchase/mosaic-types@0.1.0-beta.86
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.86

## 0.1.0-beta.85

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.85
- @jpmorganchase/mosaic-schemas@0.1.0-beta.85
- @jpmorganchase/mosaic-types@0.1.0-beta.85

## 0.1.0-beta.84

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.84
- @jpmorganchase/mosaic-schemas@0.1.0-beta.84
- @jpmorganchase/mosaic-types@0.1.0-beta.84

## 0.1.0-beta.83

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.83
- @jpmorganchase/mosaic-schemas@0.1.0-beta.83
- @jpmorganchase/mosaic-types@0.1.0-beta.83

## 0.1.0-beta.82

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.82
- @jpmorganchase/mosaic-schemas@0.1.0-beta.82
- @jpmorganchase/mosaic-types@0.1.0-beta.82

## 0.1.0-beta.81

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.81
- @jpmorganchase/mosaic-schemas@0.1.0-beta.81
- @jpmorganchase/mosaic-types@0.1.0-beta.81

## 0.1.0-beta.80

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.80
- @jpmorganchase/mosaic-schemas@0.1.0-beta.80
- @jpmorganchase/mosaic-types@0.1.0-beta.80

## 0.1.0-beta.79

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.79
- @jpmorganchase/mosaic-schemas@0.1.0-beta.79
- @jpmorganchase/mosaic-types@0.1.0-beta.79

## 0.1.0-beta.78

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.78
- @jpmorganchase/mosaic-schemas@0.1.0-beta.78
- @jpmorganchase/mosaic-types@0.1.0-beta.78

## 0.1.0-beta.77

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.77
- @jpmorganchase/mosaic-schemas@0.1.0-beta.77
- @jpmorganchase/mosaic-types@0.1.0-beta.77

## 0.1.0-beta.76

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.76
- @jpmorganchase/mosaic-schemas@0.1.0-beta.76
- @jpmorganchase/mosaic-types@0.1.0-beta.76

## 0.1.0-beta.75

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.75
- @jpmorganchase/mosaic-schemas@0.1.0-beta.75
- @jpmorganchase/mosaic-types@0.1.0-beta.75

## 0.1.0-beta.74

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.74
- @jpmorganchase/mosaic-schemas@0.1.0-beta.74
- @jpmorganchase/mosaic-types@0.1.0-beta.74

## 0.1.0-beta.73

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.73
- @jpmorganchase/mosaic-schemas@0.1.0-beta.73
- @jpmorganchase/mosaic-types@0.1.0-beta.73

## 0.1.0-beta.72

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.72
- @jpmorganchase/mosaic-schemas@0.1.0-beta.72
- @jpmorganchase/mosaic-types@0.1.0-beta.72

## 0.1.0-beta.71

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.71
- @jpmorganchase/mosaic-schemas@0.1.0-beta.71
- @jpmorganchase/mosaic-types@0.1.0-beta.71

## 0.1.0-beta.70

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.70
- @jpmorganchase/mosaic-schemas@0.1.0-beta.70
- @jpmorganchase/mosaic-types@0.1.0-beta.70

## 0.1.0-beta.69

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.69
- @jpmorganchase/mosaic-schemas@0.1.0-beta.69
- @jpmorganchase/mosaic-types@0.1.0-beta.69

## 0.1.0-beta.68

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.68
- @jpmorganchase/mosaic-schemas@0.1.0-beta.68
- @jpmorganchase/mosaic-types@0.1.0-beta.68

## 0.1.0-beta.67

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.67
- @jpmorganchase/mosaic-schemas@0.1.0-beta.67
- @jpmorganchase/mosaic-types@0.1.0-beta.67

## 0.1.0-beta.66

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.66
- @jpmorganchase/mosaic-schemas@0.1.0-beta.66
- @jpmorganchase/mosaic-types@0.1.0-beta.66

## 0.1.0-beta.65

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.65
- @jpmorganchase/mosaic-schemas@0.1.0-beta.65
- @jpmorganchase/mosaic-types@0.1.0-beta.65

## 0.1.0-beta.64

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.64
- @jpmorganchase/mosaic-schemas@0.1.0-beta.64
- @jpmorganchase/mosaic-types@0.1.0-beta.64

## 0.1.0-beta.63

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.63
- @jpmorganchase/mosaic-schemas@0.1.0-beta.63
- @jpmorganchase/mosaic-types@0.1.0-beta.63

## 0.1.0-beta.62

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.62
- @jpmorganchase/mosaic-schemas@0.1.0-beta.62
- @jpmorganchase/mosaic-types@0.1.0-beta.62

## 0.1.0-beta.61

### Patch Changes

- cec89401: add `pluginTimeout` (20 secs) to fastify to prevent loading timeout
- Updated dependencies [cec89401]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.61
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.61
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
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.60
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.60
  - @jpmorganchase/mosaic-types@0.1.0-beta.60

## 0.1.0-beta.59

### Patch Changes

- Updated dependencies [b802cdc4]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.59
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.59
  - @jpmorganchase/mosaic-types@0.1.0-beta.59

## 0.1.0-beta.58

### Patch Changes

- c8db46dc: ## HTTP Source `noProxy` option

  The `noProxy` option is a regex used to check if an endpoint in the `endpoints` collection should create an http proxy agent for the request.

  ## `createHttpSource` `configuredRequests` option

  When an http source is created using the `createHttpSource` function, instead of supplying a collection of endpoints, a `configuredRequests` option can be used to provide a collection of [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) objects.

  This gives full control over the request configuration to the user.

  _Should both `endpoints` and `configuredRequests` be provided then endpoints will take precedence._

  ## Storybook Source

  Storybook config in the `stories` option can now specify a `proxyEndpoint`.

  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.58
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.58
  - @jpmorganchase/mosaic-types@0.1.0-beta.58

## 0.1.0-beta.57

### Patch Changes

- d214d112: Add catch-all default exports for

  - `@jpmorganchase/mosaic-store`
  - `@jpmorganchase/mosaic-theme`
  - `@jpmorganchase/mosaic-workflows`

  This resolves an issue when running tests from an external repo which depends on these packages

- Updated dependencies [d214d112]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.57
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.57
  - @jpmorganchase/mosaic-types@0.1.0-beta.57

## 0.1.0-beta.56

### Patch Changes

- 6d30e29f: Add new Storybook source

  Storybook stories can be extracted from Storybook and embedded into Mosaic pages.

  The stories are extracted based on a configured filter or matching tags.

  With a page created for each Story, the author can create a dynamic index of matching stories.

  eg. An index of patterns which match a specific tag

- Updated dependencies [6d30e29f]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.56
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.56
  - @jpmorganchase/mosaic-types@0.1.0-beta.56

## 0.1.0-beta.55

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.55
- @jpmorganchase/mosaic-schemas@0.1.0-beta.55
- @jpmorganchase/mosaic-types@0.1.0-beta.55

## 0.1.0-beta.54

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.54
- @jpmorganchase/mosaic-schemas@0.1.0-beta.54
- @jpmorganchase/mosaic-types@0.1.0-beta.54

## 0.1.0-beta.53

### Patch Changes

- Updated dependencies [d7098baa]
  - @jpmorganchase/mosaic-types@0.1.0-beta.53
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.53
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.53

## 0.1.0-beta.52

### Patch Changes

- Updated dependencies [9ad7418c]
  - @jpmorganchase/mosaic-types@0.1.0-beta.52
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.52
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.52

## 0.1.0-beta.51

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.51
- @jpmorganchase/mosaic-schemas@0.1.0-beta.51
- @jpmorganchase/mosaic-types@0.1.0-beta.51

## 0.1.0-beta.50

### Patch Changes

- Updated dependencies [2f015976]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.50
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.50
  - @jpmorganchase/mosaic-types@0.1.0-beta.50

## 0.1.0-beta.49

### Patch Changes

- Updated dependencies [425b5a00]
  - @jpmorganchase/mosaic-types@0.1.0-beta.49
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.49
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.49

## 0.1.0-beta.48

### Patch Changes

- Updated dependencies [0eca1d6e]
  - @jpmorganchase/mosaic-types@0.1.0-beta.48
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.48
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.48

## 0.1.0-beta.47

### Patch Changes

- Updated dependencies [6caa661a]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.47
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.47
  - @jpmorganchase/mosaic-types@0.1.0-beta.47

## 0.1.0-beta.46

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.46
- @jpmorganchase/mosaic-schemas@0.1.0-beta.46
- @jpmorganchase/mosaic-types@0.1.0-beta.46

## 0.1.0-beta.45

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.45
- @jpmorganchase/mosaic-schemas@0.1.0-beta.45
- @jpmorganchase/mosaic-types@0.1.0-beta.45

## 0.1.0-beta.44

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.44
- @jpmorganchase/mosaic-schemas@0.1.0-beta.44
- @jpmorganchase/mosaic-types@0.1.0-beta.44

## 0.1.0-beta.43

### Patch Changes

- Updated dependencies [d3b8b3a]
- Updated dependencies [0ced179]
  - @jpmorganchase/mosaic-types@0.1.0-beta.43
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.43
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.43

## 0.1.0-beta.42

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.42
- @jpmorganchase/mosaic-schemas@0.1.0-beta.42
- @jpmorganchase/mosaic-types@0.1.0-beta.42

## 0.1.0-beta.41

### Patch Changes

- 898c9ad: Feature: Source Schedules

  Sources that pull content from a remote source, need to poll the source to ensure that any updates are pulled into the mosaic filesystem.

  Source Schedules provide the ability to specify a global schedule that is applied to all sources, but with the ability to override this for individual sources.

  A schedule is defined as:

  ```json
    schedule: {
      checkIntervalMins: 0.2,
      initialDelayMs: 2000
    },
  ```

  Add the above to the root of a mosaic config file to set up a "global" schedule or to a specific source definition to set up a schedule for that source.

  The remote sources listed below have been updated to ensure compatibility with source schedules:

  - @jpmorganchase/mosaic-source-git-repo
  - @jpmorganchase/mosaic-source-http

- Updated dependencies [898c9ad]
- Updated dependencies [5cd5a87]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.41
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.41
  - @jpmorganchase/mosaic-types@0.1.0-beta.41

## 0.1.0-beta.40

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.40
- @jpmorganchase/mosaic-schemas@0.1.0-beta.40
- @jpmorganchase/mosaic-types@0.1.0-beta.40

## 0.1.0-beta.39

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.39
- @jpmorganchase/mosaic-schemas@0.1.0-beta.39
- @jpmorganchase/mosaic-types@0.1.0-beta.39

## 0.1.0-beta.38

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.38
- @jpmorganchase/mosaic-schemas@0.1.0-beta.38
- @jpmorganchase/mosaic-types@0.1.0-beta.38

## 0.1.0-beta.37

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.37
- @jpmorganchase/mosaic-schemas@0.1.0-beta.37
- @jpmorganchase/mosaic-types@0.1.0-beta.37

## 0.1.0-beta.36

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.36
- @jpmorganchase/mosaic-schemas@0.1.0-beta.36
- @jpmorganchase/mosaic-types@0.1.0-beta.36

## 0.1.0-beta.35

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.35
- @jpmorganchase/mosaic-schemas@0.1.0-beta.35
- @jpmorganchase/mosaic-types@0.1.0-beta.35

## 0.1.0-beta.34

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.34
- @jpmorganchase/mosaic-schemas@0.1.0-beta.34
- @jpmorganchase/mosaic-types@0.1.0-beta.34

## 0.1.0-beta.33

### Patch Changes

- @jpmorganchase/mosaic-from-http-request@0.1.0-beta.33
- @jpmorganchase/mosaic-schemas@0.1.0-beta.33
- @jpmorganchase/mosaic-types@0.1.0-beta.33

## 0.1.0-beta.32

### Patch Changes

- Updated dependencies [a56eadb]
- Updated dependencies [8c854fd]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.32
  - @jpmorganchase/mosaic-types@0.1.0-beta.32
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.32

## 0.1.0-beta.31

### Patch Changes

- b609fd0: Added support for containerization of the site and cli as well as providing config for kubernetes development (skaffold)

  ## @jpmorganchase/mosaic-cli

  The cli package has been updated to support containerization.

- Updated dependencies [b609fd0]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.31
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.31
  - @jpmorganchase/mosaic-types@0.1.0-beta.31

## 0.1.0-beta.30

### Patch Changes

- 18ef436: The git repo source no longer generates a double slash between the repo host and repo path.
- Updated dependencies [18ef436]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.30
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.30
  - @jpmorganchase/mosaic-types@0.1.0-beta.30

## 0.1.0-beta.29

### Minor Changes

- c78deb4: Flatten Sidebar
  Search Optimisation
  Public Assets Plugin
  TOC Indentation

### Patch Changes

- Updated dependencies [c78deb4]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.29
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.29
  - @jpmorganchase/mosaic-types@0.1.0-beta.29

## 0.1.0-beta.28

### Patch Changes

- 27ac914: 1. Layout improvements. 2. Fix: if a user hits a url that lands on a directory, the index file within that directory is resolved as the content. 3. Fix: improve Table of Contents component highlighting.
- Updated dependencies [27ac914]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.28
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.28
  - @jpmorganchase/mosaic-types@0.1.0-beta.28

## 0.1.0-beta.27

### Patch Changes

- b465413: Improvements to vercel deployments
- Updated dependencies [b465413]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.27
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.27
  - @jpmorganchase/mosaic-types@0.1.0-beta.27

## 0.1.0-beta.26

### Minor Changes

- 531c87a: ## Mosaic Theme

  The theme variables are now globally scoped and prefixed with `mosaic`.

  ## BrokenLinksPlugin

  The `BrokenLinksPlugin` uses a running instance of mosaic to verify that all links in the source pages are alive.

  If mosaic is running behind a corporate proxy, the `proxyEndpoint` option is required to fetch external URLs.

  Configuration:

  ```json
   {
        modulePath: '@jpmorganchase/mosaic-plugins/BrokenLinksPlugin',
        priority: -1,
        // Exclude this plugin in builds
        runTimeOnly: true,
        options: {
          baseUrl: process.env.MOSAIC_ACTIVE_MODE_URL || 'http://localhost:8080',
          proxyEndpoint: 'http://some-proxy-url'
        }
      }
  ```

  ## Next/Prev button

  The next and prev buttons are visible again on pages that have a layout that uses these buttons.

### Patch Changes

- Updated dependencies [531c87a]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.26
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.26
  - @jpmorganchase/mosaic-types@0.1.0-beta.26

## 0.1.0-beta.25

### Minor Changes

- 93e9b07: The theme contract provided by the `@jpmorganchase/mosaic-theme` package now uses locally scoped variable names via a Vanilla Extract [Theme Contract](https://vanilla-extract.style/documentation/api/create-theme-contract/). Previously the theme variables were globally scoped resulting in conflicts with other design systems.

### Patch Changes

- a36219c: - Next/Prev page buttons were not appearing at the bottom of a page sequence
  - Removed redundant snapshot page api
- Updated dependencies [a36219c]
- Updated dependencies [93e9b07]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.25
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.25
  - @jpmorganchase/mosaic-types@0.1.0-beta.25

## 0.1.0-beta.24

### Patch Changes

- 049d9af: 1. Pip Salt version 2. Issues 155, make 500 error more specific 3. button and sidebar styles 4. search opt-out
- Updated dependencies [049d9af]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.24
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.24
  - @jpmorganchase/mosaic-types@0.1.0-beta.24

## 0.1.0-beta.23

### Patch Changes

- 513d45f: Sidebar behavior and styling changes.
  Add Client-side search feature.
  Relax node engine requirements.
  Removal of patches from the site package.
  Update site generator templates.
- Updated dependencies [513d45f]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.23
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.23
  - @jpmorganchase/mosaic-types@0.1.0-beta.23

## 0.1.0-beta.22

### Patch Changes

- be89e4f: fix markdown tables and update generator's Salt patches

  - Salt patches in generator were out of sync with Mosaic repo
  - Markdown now support github flavoured markdown, such as Tables

- Updated dependencies [be89e4f]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.22
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.22
  - @jpmorganchase/mosaic-types@0.1.0-beta.22

## 0.1.0-beta.21

### Patch Changes

- f75fd5e: fix sidebar which was generated after `beforeSend` had completed
- Updated dependencies [f75fd5e]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.21
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.21
  - @jpmorganchase/mosaic-types@0.1.0-beta.21

## 0.1.0-beta.20

### Patch Changes

- 9c7b8ff: pip to beta.20
- Updated dependencies [9c7b8ff]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.20
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.20
  - @jpmorganchase/mosaic-types@0.1.0-beta.20

## 0.1.0-beta.19

### Patch Changes

- ad06d4c: ensure spinner is removed after page has loaded
- Updated dependencies [ad06d4c]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.19
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.19
  - @jpmorganchase/mosaic-types@0.1.0-beta.19

## 0.1.0-beta.18

### Patch Changes

- 066efed: Update docs with quick-start guide

  Sample docs now include a 'quick-start' guide to onboarding to AWS.

  Also

  - generator default directory is the current directory
  - after generating a site, it will run `yarn` in the created directory. This simplifies the generator call to just `yarn mosaic-create-site`

- Updated dependencies [066efed]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.18
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.18
  - @jpmorganchase/mosaic-types@0.1.0-beta.18

## 0.1.0-beta.17

### Patch Changes

- b2f6d52: Fix `pre` block code block rendering
- Updated dependencies [b2f6d52]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.17
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.17
  - @jpmorganchase/mosaic-types@0.1.0-beta.17

## 0.1.0-beta.16

### Patch Changes

- 3a5c88a: add missing `@types/node` dependency for generator
- Updated dependencies [3a5c88a]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.16
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.16
  - @jpmorganchase/mosaic-types@0.1.0-beta.16

## 0.1.0-beta.15

### Patch Changes

- aaaf255: initial release of HTTP Source package.

  An HTTP source accepts a collection of endpoints and a path to a transformer module.
  The response from fetching is transformed and merged together into 1 single collection of pages.
  Should 1 of the endpoints request fail then it will have no impact on the other requests.

- Updated dependencies [aaaf255]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.15
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.15
  - @jpmorganchase/mosaic-types@0.1.0-beta.15
