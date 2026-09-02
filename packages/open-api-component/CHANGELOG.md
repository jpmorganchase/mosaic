# @jpmorganchase/mosaic-open-api-component

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

- Updated dependencies [b78c699]
- Updated dependencies [b78c699]
  - @jpmorganchase/mosaic-components@0.1.0-beta.98
  - @jpmorganchase/mosaic-theme@0.1.0-beta.98

## 0.1.0-beta.97

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.97
- @jpmorganchase/mosaic-theme@0.1.0-beta.97

## 0.1.0-beta.96

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.96
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
  - @jpmorganchase/mosaic-components@0.1.0-beta.95
  - @jpmorganchase/mosaic-theme@0.1.0-beta.95

## 0.1.0-beta.94

### Patch Changes

- Updated dependencies [da178f8f]
  - @jpmorganchase/mosaic-components@0.1.0-beta.94
  - @jpmorganchase/mosaic-theme@0.1.0-beta.94

## 0.1.0-beta.93

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.93
- @jpmorganchase/mosaic-theme@0.1.0-beta.93

## 0.1.0-beta.92

### Patch Changes

- Updated dependencies [c5b7a75c]
  - @jpmorganchase/mosaic-components@0.1.0-beta.92
  - @jpmorganchase/mosaic-theme@0.1.0-beta.92

## 0.1.0-beta.91

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.91
- @jpmorganchase/mosaic-theme@0.1.0-beta.91

## 0.1.0-beta.90

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.90
- @jpmorganchase/mosaic-theme@0.1.0-beta.90

## 0.1.0-beta.89

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.89
- @jpmorganchase/mosaic-theme@0.1.0-beta.89

## 0.1.0-beta.88

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.88
- @jpmorganchase/mosaic-theme@0.1.0-beta.88

## 0.1.0-beta.87

### Patch Changes

- Updated dependencies [dca2d049]
  - @jpmorganchase/mosaic-theme@0.1.0-beta.87
  - @jpmorganchase/mosaic-components@0.1.0-beta.87

## 0.1.0-beta.86

### Patch Changes

- Updated dependencies [bb1189a1]
  - @jpmorganchase/mosaic-theme@0.1.0-beta.86
  - @jpmorganchase/mosaic-components@0.1.0-beta.86

## 0.1.0-beta.85

### Patch Changes

- Updated dependencies [e6104310]
  - @jpmorganchase/mosaic-theme@0.1.0-beta.85
  - @jpmorganchase/mosaic-components@0.1.0-beta.85

## 0.1.0-beta.84

### Patch Changes

- Updated dependencies [49cbe9fd]
  - @jpmorganchase/mosaic-components@0.1.0-beta.84
  - @jpmorganchase/mosaic-theme@0.1.0-beta.84

## 0.1.0-beta.83

### Patch Changes

- Updated dependencies [24551c8d]
- Updated dependencies [8e96ed0c]
  - @jpmorganchase/mosaic-components@0.1.0-beta.83
  - @jpmorganchase/mosaic-theme@0.1.0-beta.83

## 0.1.0-beta.82

### Patch Changes

- Updated dependencies [fb689099]
  - @jpmorganchase/mosaic-components@0.1.0-beta.82
  - @jpmorganchase/mosaic-theme@0.1.0-beta.82

## 0.1.0-beta.81

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.81
- @jpmorganchase/mosaic-theme@0.1.0-beta.81

## 0.1.0-beta.80

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.80
- @jpmorganchase/mosaic-theme@0.1.0-beta.80

## 0.1.0-beta.79

### Patch Changes

- Updated dependencies [244ed5c3]
  - @jpmorganchase/mosaic-components@0.1.0-beta.79
  - @jpmorganchase/mosaic-theme@0.1.0-beta.79

## 0.1.0-beta.78

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.78
- @jpmorganchase/mosaic-theme@0.1.0-beta.78

## 0.1.0-beta.77

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.77
- @jpmorganchase/mosaic-theme@0.1.0-beta.77

## 0.1.0-beta.76

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.76
- @jpmorganchase/mosaic-theme@0.1.0-beta.76

## 0.1.0-beta.75

### Patch Changes

- Updated dependencies [ffc03a18]
- Updated dependencies [fd6d715d]
  - @jpmorganchase/mosaic-components@0.1.0-beta.75
  - @jpmorganchase/mosaic-theme@0.1.0-beta.75

## 0.1.0-beta.74

### Patch Changes

- Updated dependencies [2d4e5616]
  - @jpmorganchase/mosaic-components@0.1.0-beta.74
  - @jpmorganchase/mosaic-theme@0.1.0-beta.74

## 0.1.0-beta.73

### Patch Changes

- de00c017: Added the files package.json field to all of the packages to prevent unnecessary files being published.
- Updated dependencies [de00c017]
  - @jpmorganchase/mosaic-components@0.1.0-beta.73
  - @jpmorganchase/mosaic-theme@0.1.0-beta.73

## 0.1.0-beta.72

### Patch Changes

- Updated dependencies [e5d14ab4]
  - @jpmorganchase/mosaic-components@0.1.0-beta.72
  - @jpmorganchase/mosaic-theme@0.1.0-beta.72

## 0.1.0-beta.71

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.71
- @jpmorganchase/mosaic-theme@0.1.0-beta.71

## 0.1.0-beta.70

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.70
- @jpmorganchase/mosaic-theme@0.1.0-beta.70

## 0.1.0-beta.69

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.69
- @jpmorganchase/mosaic-theme@0.1.0-beta.69

## 0.1.0-beta.68

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.68
- @jpmorganchase/mosaic-theme@0.1.0-beta.68

## 0.1.0-beta.67

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.67
- @jpmorganchase/mosaic-theme@0.1.0-beta.67

## 0.1.0-beta.66

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.66
- @jpmorganchase/mosaic-theme@0.1.0-beta.66

## 0.1.0-beta.65

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.65
- @jpmorganchase/mosaic-theme@0.1.0-beta.65

## 0.1.0-beta.64

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.64
- @jpmorganchase/mosaic-theme@0.1.0-beta.64

## 0.1.0-beta.63

### Patch Changes

- Updated dependencies [680eb0eb]
  - @jpmorganchase/mosaic-components@0.1.0-beta.63
  - @jpmorganchase/mosaic-theme@0.1.0-beta.63

## 0.1.0-beta.62

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.62
- @jpmorganchase/mosaic-theme@0.1.0-beta.62

## 0.1.0-beta.61

### Patch Changes

- cec89401: add `pluginTimeout` (20 secs) to fastify to prevent loading timeout
- Updated dependencies [cec89401]
  - @jpmorganchase/mosaic-components@0.1.0-beta.61
  - @jpmorganchase/mosaic-theme@0.1.0-beta.61

## 0.1.0-beta.60

### Patch Changes

- a3da0830: New Readme Source

  This source pulls a single Readme.md from a remote Source repo.
  Typically used for third-party repos which exist already or don't want to
  create a full document hierachy and use `@jpmorganchase/mosaic-source-git-repo`.
  By pulling a single page, we can add metadata to that page via the source's config.
  It's also more performant as we do not need to pull a whole source repo.

- Updated dependencies [a3da0830]
  - @jpmorganchase/mosaic-components@0.1.0-beta.60
  - @jpmorganchase/mosaic-theme@0.1.0-beta.60

## 0.1.0-beta.59

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.59
- @jpmorganchase/mosaic-theme@0.1.0-beta.59

## 0.1.0-beta.58

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.58
- @jpmorganchase/mosaic-theme@0.1.0-beta.58

## 0.1.0-beta.57

### Patch Changes

- d214d112: Add catch-all default exports for

  - `@jpmorganchase/mosaic-store`
  - `@jpmorganchase/mosaic-theme`
  - `@jpmorganchase/mosaic-workflows`

  This resolves an issue when running tests from an external repo which depends on these packages

- Updated dependencies [d214d112]
  - @jpmorganchase/mosaic-theme@0.1.0-beta.57
  - @jpmorganchase/mosaic-components@0.1.0-beta.57

## 0.1.0-beta.56

### Patch Changes

- 6d30e29f: Add new Storybook source

  Storybook stories can be extracted from Storybook and embedded into Mosaic pages.

  The stories are extracted based on a configured filter or matching tags.

  With a page created for each Story, the author can create a dynamic index of matching stories.

  eg. An index of patterns which match a specific tag

- Updated dependencies [6d30e29f]
  - @jpmorganchase/mosaic-components@0.1.0-beta.56
  - @jpmorganchase/mosaic-theme@0.1.0-beta.56

## 0.1.0-beta.55

### Patch Changes

- Updated dependencies [3dd27378]
  - @jpmorganchase/mosaic-components@0.1.0-beta.55
  - @jpmorganchase/mosaic-theme@0.1.0-beta.55

## 0.1.0-beta.54

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.54
- @jpmorganchase/mosaic-theme@0.1.0-beta.54

## 0.1.0-beta.53

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.53
- @jpmorganchase/mosaic-theme@0.1.0-beta.53

## 0.1.0-beta.52

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.52
- @jpmorganchase/mosaic-theme@0.1.0-beta.52

## 0.1.0-beta.51

### Patch Changes

- Updated dependencies [56bbad4b]
  - @jpmorganchase/mosaic-components@0.1.0-beta.51
  - @jpmorganchase/mosaic-theme@0.1.0-beta.51

## 0.1.0-beta.50

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.50
- @jpmorganchase/mosaic-theme@0.1.0-beta.50

## 0.1.0-beta.49

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.49
- @jpmorganchase/mosaic-theme@0.1.0-beta.49

## 0.1.0-beta.48

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.48
- @jpmorganchase/mosaic-theme@0.1.0-beta.48

## 0.1.0-beta.47

### Patch Changes

- Updated dependencies [5abe7fdf]
- Updated dependencies [19b4e49a]
  - @jpmorganchase/mosaic-components@0.1.0-beta.47
  - @jpmorganchase/mosaic-theme@0.1.0-beta.47

## 0.1.0-beta.46

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.46
- @jpmorganchase/mosaic-theme@0.1.0-beta.46

## 0.1.0-beta.45

### Patch Changes

- Updated dependencies [020ae58d]
  - @jpmorganchase/mosaic-components@0.1.0-beta.45
  - @jpmorganchase/mosaic-theme@0.1.0-beta.45

## 0.1.0-beta.44

### Patch Changes

- Updated dependencies [cc5183e]
- Updated dependencies [36896ac]
  - @jpmorganchase/mosaic-components@0.1.0-beta.44
  - @jpmorganchase/mosaic-theme@0.1.0-beta.44

## 0.1.0-beta.43

### Patch Changes

- Updated dependencies [0dc621d]
- Updated dependencies [4e69178]
  - @jpmorganchase/mosaic-components@0.1.0-beta.43
  - @jpmorganchase/mosaic-theme@0.1.0-beta.43

## 0.1.0-beta.42

### Patch Changes

- Updated dependencies [3491f29]
  - @jpmorganchase/mosaic-components@0.1.0-beta.42
  - @jpmorganchase/mosaic-theme@0.1.0-beta.42

## 0.1.0-beta.41

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.41
- @jpmorganchase/mosaic-theme@0.1.0-beta.41

## 0.1.0-beta.40

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.40
- @jpmorganchase/mosaic-theme@0.1.0-beta.40

## 0.1.0-beta.39

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.39
- @jpmorganchase/mosaic-theme@0.1.0-beta.39

## 0.1.0-beta.38

### Patch Changes

- Updated dependencies [18f7a0b]
  - @jpmorganchase/mosaic-theme@0.1.0-beta.38
  - @jpmorganchase/mosaic-components@0.1.0-beta.38

## 0.1.0-beta.37

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.37
- @jpmorganchase/mosaic-theme@0.1.0-beta.37

## 0.1.0-beta.36

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.36
- @jpmorganchase/mosaic-theme@0.1.0-beta.36

## 0.1.0-beta.35

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.35
- @jpmorganchase/mosaic-theme@0.1.0-beta.35

## 0.1.0-beta.34

### Patch Changes

- Updated dependencies [3d117d3]
  - @jpmorganchase/mosaic-components@0.1.0-beta.34
  - @jpmorganchase/mosaic-theme@0.1.0-beta.34

## 0.1.0-beta.33

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.33
- @jpmorganchase/mosaic-theme@0.1.0-beta.33

## 0.1.0-beta.32

### Patch Changes

- Updated dependencies [6265b19]
  - @jpmorganchase/mosaic-components@0.1.0-beta.32
  - @jpmorganchase/mosaic-theme@0.1.0-beta.32

## 0.1.0-beta.31

### Patch Changes

- b609fd0: Added support for containerization of the site and cli as well as providing config for kubernetes development (skaffold)

  ## @jpmorganchase/mosaic-cli

  The cli package has been updated to support containerization.

- Updated dependencies [b609fd0]
- Updated dependencies [d04fb1e]
  - @jpmorganchase/mosaic-components@0.1.0-beta.31
  - @jpmorganchase/mosaic-theme@0.1.0-beta.31

## 0.1.0-beta.30

### Patch Changes

- 18ef436: The git repo source no longer generates a double slash between the repo host and repo path.
- Updated dependencies [18ef436]
  - @jpmorganchase/mosaic-components@0.1.0-beta.30
  - @jpmorganchase/mosaic-theme@0.1.0-beta.30

## 0.1.0-beta.29

### Minor Changes

- c78deb4: Flatten Sidebar
  Search Optimisation
  Public Assets Plugin
  TOC Indentation

### Patch Changes

- Updated dependencies [c78deb4]
  - @jpmorganchase/mosaic-components@0.1.0-beta.29
  - @jpmorganchase/mosaic-theme@0.1.0-beta.29

## 0.1.0-beta.28

### Patch Changes

- 27ac914: 1. Layout improvements. 2. Fix: if a user hits a url that lands on a directory, the index file within that directory is resolved as the content. 3. Fix: improve Table of Contents component highlighting.
- Updated dependencies [27ac914]
  - @jpmorganchase/mosaic-components@0.1.0-beta.28
  - @jpmorganchase/mosaic-theme@0.1.0-beta.28

## 0.1.0-beta.27

### Patch Changes

- b465413: Improvements to vercel deployments
- Updated dependencies [0a672d4]
- Updated dependencies [b465413]
  - @jpmorganchase/mosaic-components@0.1.0-beta.27
  - @jpmorganchase/mosaic-theme@0.1.0-beta.27

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
  - @jpmorganchase/mosaic-theme@0.1.0-beta.26
  - @jpmorganchase/mosaic-components@0.1.0-beta.26

## 0.1.0-beta.25

### Minor Changes

- 93e9b07: The theme contract provided by the `@jpmorganchase/mosaic-theme` package now uses locally scoped variable names via a Vanilla Extract [Theme Contract](https://vanilla-extract.style/documentation/api/create-theme-contract/). Previously the theme variables were globally scoped resulting in conflicts with other design systems.

### Patch Changes

- a36219c: - Next/Prev page buttons were not appearing at the bottom of a page sequence
  - Removed redundant snapshot page api
- Updated dependencies [a36219c]
- Updated dependencies [93e9b07]
  - @jpmorganchase/mosaic-components@0.1.0-beta.25
  - @jpmorganchase/mosaic-theme@0.1.0-beta.25

## 0.1.0-beta.24

### Patch Changes

- 049d9af: 1. Pip Salt version 2. Issues 155, make 500 error more specific 3. button and sidebar styles 4. search opt-out
- Updated dependencies [049d9af]
  - @jpmorganchase/mosaic-components@0.1.0-beta.24
  - @jpmorganchase/mosaic-theme@0.1.0-beta.24

## 0.1.0-beta.23

### Patch Changes

- 513d45f: Sidebar behavior and styling changes.
  Add Client-side search feature.
  Relax node engine requirements.
  Removal of patches from the site package.
  Update site generator templates.
- Updated dependencies [513d45f]
  - @jpmorganchase/mosaic-components@0.1.0-beta.23
  - @jpmorganchase/mosaic-theme@0.1.0-beta.23

## 0.1.0-beta.22

### Patch Changes

- be89e4f: fix markdown tables and update generator's Salt patches

  - Salt patches in generator were out of sync with Mosaic repo
  - Markdown now support github flavoured markdown, such as Tables

- Updated dependencies [be89e4f]
  - @jpmorganchase/mosaic-components@0.1.0-beta.22
  - @jpmorganchase/mosaic-theme@0.1.0-beta.22

## 0.1.0-beta.21

### Patch Changes

- f75fd5e: fix sidebar which was generated after `beforeSend` had completed
- Updated dependencies [f75fd5e]
  - @jpmorganchase/mosaic-components@0.1.0-beta.21
  - @jpmorganchase/mosaic-theme@0.1.0-beta.21

## 0.1.0-beta.20

### Patch Changes

- 9c7b8ff: pip to beta.20
- Updated dependencies [9c7b8ff]
  - @jpmorganchase/mosaic-components@0.1.0-beta.20
  - @jpmorganchase/mosaic-theme@0.1.0-beta.20

## 0.1.0-beta.19

### Patch Changes

- ad06d4c: ensure spinner is removed after page has loaded
- Updated dependencies [ad06d4c]
  - @jpmorganchase/mosaic-components@0.1.0-beta.19
  - @jpmorganchase/mosaic-theme@0.1.0-beta.19

## 0.1.0-beta.18

### Patch Changes

- 066efed: Update docs with quick-start guide

  Sample docs now include a 'quick-start' guide to onboarding to AWS.

  Also

  - generator default directory is the current directory
  - after generating a site, it will run `yarn` in the created directory. This simplifies the generator call to just `yarn mosaic-create-site`

- Updated dependencies [066efed]
  - @jpmorganchase/mosaic-components@0.1.0-beta.18
  - @jpmorganchase/mosaic-theme@0.1.0-beta.18

## 0.1.0-beta.17

### Patch Changes

- b2f6d52: Fix `pre` block code block rendering
- Updated dependencies [b2f6d52]
  - @jpmorganchase/mosaic-components@0.1.0-beta.17
  - @jpmorganchase/mosaic-theme@0.1.0-beta.17

## 0.1.0-beta.16

### Patch Changes

- 3a5c88a: add missing `@types/node` dependency for generator
- Updated dependencies [3a5c88a]
  - @jpmorganchase/mosaic-components@0.1.0-beta.16
  - @jpmorganchase/mosaic-theme@0.1.0-beta.16

## 0.1.0-beta.15

### Patch Changes

- aaaf255: initial release of HTTP Source package.

  An HTTP source accepts a collection of endpoints and a path to a transformer module.
  The response from fetching is transformed and merged together into 1 single collection of pages.
  Should 1 of the endpoints request fail then it will have no impact on the other requests.

- Updated dependencies [aaaf255]
  - @jpmorganchase/mosaic-components@0.1.0-beta.15
  - @jpmorganchase/mosaic-theme@0.1.0-beta.15

## 0.1.0-beta.14

### Patch Changes

- dde3b5a: Feature release

  - Enhanced generators now have defaults.
    With one command (`yarn mosaic-create-site create`) it will generate a fully working site with both local and remote sources
  - Fix an issue where we could not clone from the master branch of git repos
  - Migrate to Next 13 image

- Updated dependencies [dde3b5a]
  - @jpmorganchase/mosaic-components@0.1.0-beta.14
  - @jpmorganchase/mosaic-theme@0.1.0-beta.14

## 0.1.0-beta.13

### Patch Changes

- d4da1df: incremental improvements

  - move colormode into store
  - ensure breadcrumbs and sidebar data is only added to frontmatter for pages which use a layout that has breadcrumbs or a sidebar
  - improve changeset so it can work standalone without a monorepo
  - resolev json5 vulnerability

- Updated dependencies [d4da1df]
  - @jpmorganchase/mosaic-components@0.1.0-beta.13
  - @jpmorganchase/mosaic-theme@0.1.0-beta.13

## 0.1.0-beta.12

### Patch Changes

- 9ec358b: Upgrade React to version 18 and NextJs to version 13
- 3eb35bf: initial work to enable generators to run outside of the repo
- Updated dependencies [9ec358b]
- Updated dependencies [3eb35bf]
  - @jpmorganchase/mosaic-components@0.1.0-beta.12
  - @jpmorganchase/mosaic-theme@0.1.0-beta.12

## 0.1.0-beta.11

### Patch Changes

- 146a4bb: fix SSR Initial render

  removed Salt Core patch
  added Salt Labs patch (Cascading Menu) to support SSR

- fc5d7b5: Generators can now interactively add sources

  Previously we were making local edits to our own site or examples to implement new features.
  What we wanted was the ability to create a local rig, A local rig can be used for development purposes,
  without touching our site code.

  We have added Mosaic repo commands, to enable us to generates local rigs (`yarn gen:rig`) and deploy our own
  tech docs via snapshot (`yarn gen`)

  To generate a site+snapshot from sources defined in `mosaic-generators.js`, run `yarn gen`
  To generate a dynamic site from sources defined in `mosaic-generators.js`, run `yarn gen:site`
  To generate a rig `yarn gen:rig`

  Equally these changes can be used to generate sites in other repos via the `mosaic-create-site` command.

  `yarn mosaic-create-site init` will create a `mosaic.generators.js`.

  Configure the `mosaic.generators.js` with your generator and sources, then run.

  `yarn mosaic-create-site create -i -o path/to/my-site`

  When this command is run, it will present an interactive menu of generators and output the site to `path/to/my-site`.

- Updated dependencies [146a4bb]
- Updated dependencies [fc5d7b5]
  - @jpmorganchase/mosaic-components@0.1.0-beta.11
  - @jpmorganchase/mosaic-theme@0.1.0-beta.11

## 0.1.0-beta.10

### Patch Changes

- af2f579: Converted repo to ESM and Salt DS nomenclature

  - Switch UITK nomenclature to Salt DS
    Upgraded to first stable version of Salt DS version 1.0.0
  - CommonJS code switched to ESM and upgraded to Node 16
  - Removed example-nextjs-ssr package as un-required, can be replaced by documentation
  - Sites can now generate immutable snapshots of content that loads content like a SGS (statically generated site)
    Snapshots can be used as a serverless solution when deployed to Vercel.
  - New Middleware package `@jpmorganchase/mosaic-site-middleware`

- Updated dependencies [af2f579]
  - @jpmorganchase/mosaic-components@0.1.0-beta.10
  - @jpmorganchase/mosaic-theme@0.1.0-beta.10
