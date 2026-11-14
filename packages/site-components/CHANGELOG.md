# @jpmorganchase/mosaic-site-components

## 1.0.0-beta.99

### Major Changes

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

### Patch Changes

- a1df13e: Close navigation drawers with Escape and preserve the header trigger's accessible name while its icon is hidden.
- 5510744: Upgrade Next.js to 16.4.2
  
  Next.js 16.3.8 and earlier are affected by
  [GHSA-p3m5-59mp-jv5r](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r)
  (denial of service through Server Actions) and
  [GHSA-2464-fhr4-w9xw](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw)
  (remote code execution in Image Optimization with SVG files). Both are fixed
  in 16.4.1 and 15.5.28.
  
  `@jpmorganchase/mosaic-layouts`, `@jpmorganchase/mosaic-site-components` and
  `@jpmorganchase/mosaic-site-middleware` now require `next@^16.4.2`, and the
  `next` peer range of `@jpmorganchase/mosaic-content-editor-plugin` is now
  `^15.5.28 || ^16.4.1`.
- d1c795e: Let a persistent App Router layout render the app header
  
  - Add `FrameProvider`, `useFrame` and `LayoutHeader`. A host that renders
    the header once in a layout (so it stays mounted while readers navigate)
    renders it inside `<LayoutHeader>` and wraps the page in
    `<FrameProvider value={{ header: true }}>`; `LayoutBase` then leaves its
    own header out. Without a provider, layouts render the header as before.
  - `@jpmorganchase/mosaic-site-components`: `Drawer` (the header's mobile
    menu) closes when the pathname changes, so it also closes when the
    header stays mounted across navigations.
  - `@jpmorganchase/mosaic-content-editor-plugin`: the New Page dialog
    starts a new draft on each page, so it pre-selects the current folder
    instead of keeping the previous page's values when it stays mounted.
  
  **Reference site (`packages/site`)**
  
  - The optional catch-all route moves under `app/[namespace]/[[...route]]/`. The new
    `[namespace]/layout.tsx` loads the namespace's shared config and search
    index once and keeps the header mounted across navigations, so the
    header (logo, menus, search, session controls) is no longer rebuilt on
    every page change. Pages pass their canonical content route, per-folder
    header overrides and edit state to it with `<FrameSync>`, keeping
    relative links and images correct for index URLs and aliases.
    Initial server HTML uses the layout's fallback config and its matching
    index route; the page's canonical route and config take over before
    the first client paint.
  - Single-segment documents and aliases still resolve through the content
    loaders. The first URL segment is a frame boundary, not a requirement
    that sources have a URL prefix. Known top-level index shorthand URLs
    are included in static exports too.
  - Client-side navigation within a namespace no longer re-sends the search
    index with every page (Next.js may still inline it into prefetches when
    it is small).
  - 404s inside a namespace render within the namespace layout, header
    included, without loading any data; `notFoundChromeAction` is removed.
  - Sidebars continue to be loaded per page; this change only persists the
    header and its search data.
- d1c795e: Align React peer dependencies with supported consumers. The store, icons, theme,
  OpenAPI component and sitemap component accept React 18 or 19 and matching type
  packages. Components and site components require React 19 types, matching their
  existing React 19 runtime peer and the Next.js 16 site integration.
- 2ecdf25: Use the React 19 line of next-mdx-remote-client in the App Router host and published MDX renderer/compiler. Align their React and React DOM minimum with its React 19.1 requirement, including the workspace test renderer. The editor's serialization type contract accepts both MDX runtime majors. Update SWR and Zustand minimums so existing consumers replace older React 18-only dependency selections when installing the snapshot.
- 915b9ae: Fix issues found in a review of the App Router site
  
  **`@jpmorganchase/mosaic-store`**
  
  - Add `reseedStore(store, state)`. It replaces a store's page state with
    a new seed while keeping the colour mode and actions; keys missing
    from the new seed return to their defaults. The reference site's
    `StoreShell` uses it so the sidebar, table of contents and breadcrumbs
    follow `router.refresh()`, which previously only updated the page
    body.
  
  **`@jpmorganchase/mosaic-site-middleware`**
  
  - In `snapshot-file` mode, `getMdxRaw` and `getSharedConfig` decode
    percent-encoded routes before reading files, so pages whose names
    contain spaces or non-ASCII characters are found. Decoded paths that
    would leave the snapshot (`..` or `.` segments, backslashes, NUL bytes)
    are treated as not found.
  
  **`@jpmorganchase/mosaic-site-components`**
  
  - The header's Login link no longer causes a hydration mismatch. Its
    fallback `href` is built from the router pathname (which the server
    and the browser agree on) instead of `window.location`; the click
    handler still sends the full path, query and hash as the callback.
  
  **`@jpmorganchase/mosaic-content-editor-plugin`**
  
  - The `next` peer dependency is now `^15.5.28 || ^16.4.1`. Earlier
    releases are affected by critical remote code execution advisories
    (GHSA-2xp9-vwfh-vxw4, GHSA-p293-qw3h-jr36).
  
  **Reference site (`packages/site`)**
  
  - Creating a page (`?new=1`) no longer returns 404 unless the dev
    capability bypass is on: the check now uses the shared config of the
    folder the new page goes into.
  - `not-found.tsx` no longer loads data on the server, because Next.js
    renders it as part of every page response. The 404 page loads the
    header for the section the reader was in from the browser. In
    `next dev` it now really recovers from 404s served while the CLI is
    still loading: it reloads the page once the URL resolves
    (`router.refresh()` can't clear a 404), and shows nothing extra on
    genuine 404s.
  - Every page now gets `<link rel="canonical">` from its `route`
    frontmatter, so folder URLs and aliases point at the page in every
    content mode, and folder URLs are rewritten to the canonical route in
    snapshot modes too.
  - `error.tsx` retries with Next.js 16.3's `retry()`, which re-renders
    Server Components; a new `global-error.tsx` handles root-layout
    failures.
  - `MOSAIC_OUTPUT=standalone` emits the `.next/standalone` server that
    the Dockerfiles copy into their runtime images; `next.config.js` had
    stopped emitting it in 2024. The Dockerfiles now set it.
  - `yarn build:static:*` works again. The generated API route and Server
    Action stubs accept any arguments, so the tests type-checked during
    the build compile, and `sitemap.ts` no longer sets `revalidate = 0`,
    which `output: 'export'` rejects. The sitemap is now regenerated every
    five minutes in snapshot builds and stays per-request in active mode.
  - Sites without auth no longer request `/api/auth/session` on every page
    load.
  - The site's ESLint config loads again and `yarn lint` now covers the
    site. It failed with "Cannot redefine plugin react-hooks" because the
    root used `eslint-plugin-react-hooks@5` while `eslint-config-next`
    ships `@7`; the root now uses `^7.0.0`.
- 915b9ae: Secure the content server and editor, fix the save flow, and slim the App Router site
  
  ### Breaking changes
  
  **`@jpmorganchase/mosaic-cli`**
  
  - The `/workflows` WebSocket only runs workflows for messages carrying
    `token` = `MOSAIC_WORKFLOWS_SECRET`; without that env var no workflow
    runs, and the placeholder from `.env.development` only counts when
    `NODE_ENV=development`. Messages are validated (workflow name, user,
    route) and capped at 5 MB.
  - Admin endpoints other than `/_mosaic_/tags/list` require
    `MOSAIC_ADMIN_SECRET`: sent as `x-mosaic-admin-secret`, a bearer token,
    or the password of the browser login prompt (HTTP Basic). Without the
    env var they are open when `NODE_ENV=development` and disabled
    otherwise.
  - CORS headers are no longer sent to every origin. Allow specific
    origins with `MOSAIC_CORS_ORIGINS` (comma-separated).
  
  **Reference site (`packages/site`)**
  
  - Editing requires `MOSAIC_EDITORS` (emails, `@domains` or `*`); when it
    is unset nobody can sign in or edit in production. Set
    `MOSAIC_EDITORS=*` to keep the previous "anyone who can sign in"
    behaviour. Emails and `@domains` only match GitHub emails that
    GitHub has verified.
  - Saves need `MOSAIC_WORKFLOWS_URL` and `MOSAIC_WORKFLOWS_SECRET`
    (renamed from `NEXT_PUBLIC_MOSAIC_WORKFLOWS_URL`).
  - The committed `.env.local` is now `.env.development`, which Next.js
    only loads for `next dev`. Production builds no longer pick up its
    placeholder `AUTH_SECRET` or dev-only flags, and the site refuses the
    placeholder secrets when `NODE_ENV=production`.
  - `.env.prod` is renamed to `.env.production`, the name Next.js actually
    loads for `next build` / `next start`. Production builds therefore now
    default to `MOSAIC_MODE=snapshot-file`; set `MOSAIC_MODE=active` for
    deployments that read from a running Mosaic CLI.
  
  ### Fixes
  
  - **Saving works again.** The CLI echoes the caller's channel (the site
    had switched to a different channel hash, so every progress message
    was dropped and saves never finished), new pages can be created in the
    source whose `prefixDir` contains them (the CLI required the route to
    exist already, and the editor had no route for a new page), and saves
    time out (`MOSAIC_WORKFLOWS_TIMEOUT_MS`, default 5 minutes) and always
    close their socket.
  - Workflow failures are reported to the editor instead of crashing the
    CLI with an unhandled rejection. The GitHub workflow accepts the
    site's `sid` when no `id` is sent.
  - Routes are validated before they are forwarded, and workflows refuse
    to write or rename files outside the source's content folder.
  - Symlinks inside a content folder can no longer publish files from
    outside it (local-folder and git-repo sources, and the CLI's
    `/_mosaic-raw/*` route).
  - Admin responses no longer overwrite git credentials in the live
    config with the redacted value.
  - Search results escape the indexed text before highlighting (it was
    rendered as HTML), escape the query before building a regex, and
    search the current input rather than the previous keystroke.
  - Frontmatter edits are kept when the author leaves the Frontmatter tab
    before saving, and frontmatter-only or first source-mode edits now
    count as unsaved changes.
  - `LayoutProvider` accepts the server's `isEditing` state, so
    prerendered pages render their real layout (sidebar, breadcrumbs,
    header controls) in the HTML instead of falling back to client
    rendering.
  - The Lexical editor is no longer part of every page's JavaScript:
    `@jpmorganchase/mosaic-content-editor-plugin` exposes subpath exports
    (`/useEditMode`, `/LayoutNamesContext`, `/components/EditorControls`,
    …) and the site lazy-loads the editor from a Client Component.
  - Loader caches never store not-found results. Active mode can opt in to
    cross-request caching with `MOSAIC_ACTIVE_MODE_CACHE=true`. Compiled
    MDX is cached by content hash.
  - `/api/revalidate` expires the content cache immediately
    (`{ expire: 0 }`) rather than serving stale content once more.
  - Per-page stores are released when the page unmounts (`disposeStore`)
    instead of leaking a store and a `storage` listener per navigation.
  
  ### Additions
  
  - `@jpmorganchase/mosaic-content-editor-plugin`: `EditModeProvider`,
    `useIsEditing` and `useEditModeActions`; `<Editor route>` prop.
  - `@jpmorganchase/mosaic-store`: `registerStore` and `disposeStore`.
  - `@jpmorganchase/mosaic-site-middleware`, `-layouts` and
    `-site-components` now declare `next` as a peer dependency.
- Updated dependencies [2ecdf25]
- Updated dependencies [0c4d822]
- Updated dependencies [2ecdf25]
- Updated dependencies [a1df13e]
- Updated dependencies [0c4d822]
- Updated dependencies [f47df89]
- Updated dependencies [5510744]
- Updated dependencies [d1c795e]
- Updated dependencies [02784b5]
- Updated dependencies [d1c795e]
- Updated dependencies [2ecdf25]
- Updated dependencies [915b9ae]
- Updated dependencies [915b9ae]
- Updated dependencies [915b9ae]
- Updated dependencies [2a2f07e]
- Updated dependencies [5d69155]
- Updated dependencies [168391e]
  - @jpmorganchase/mosaic-components@1.0.0-beta.99
  - @jpmorganchase/mosaic-content-editor-plugin@1.0.0-beta.99
  - @jpmorganchase/mosaic-open-api-component@1.0.0-beta.99
  - @jpmorganchase/mosaic-store@1.0.0-beta.99
  - @jpmorganchase/mosaic-theme@1.0.0-beta.99

## 0.1.0-beta.98

### Patch Changes

- b78c699: Update Salt dependencies
- b78c699: Update Next.js
- Updated dependencies [b78c699]
- Updated dependencies [b78c699]
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.98
  - @jpmorganchase/mosaic-components@0.1.0-beta.98
  - @jpmorganchase/mosaic-theme@0.1.0-beta.98
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.98
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.98
  - @jpmorganchase/mosaic-store@0.1.0-beta.98

## 0.1.0-beta.97

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.97
- @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.97
- @jpmorganchase/mosaic-open-api-component@0.1.0-beta.97
- @jpmorganchase/mosaic-site-middleware@0.1.0-beta.97
- @jpmorganchase/mosaic-store@0.1.0-beta.97
- @jpmorganchase/mosaic-theme@0.1.0-beta.97

## 0.1.0-beta.96

### Patch Changes

- Updated dependencies [5e42846]
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.96
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.96
  - @jpmorganchase/mosaic-store@0.1.0-beta.96
  - @jpmorganchase/mosaic-components@0.1.0-beta.96
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.96
  - @jpmorganchase/mosaic-theme@0.1.0-beta.96

## 0.1.0-beta.95

### Patch Changes

- 85bc12f: Add additional `<head/>` metadata

  - added namespace to page title
  - added new meta, lastModified timestamp

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

- Updated dependencies [85bc12f]
- Updated dependencies [18bdd6a]
  - @jpmorganchase/mosaic-store@0.1.0-beta.95
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.95
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.95
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.95
  - @jpmorganchase/mosaic-components@0.1.0-beta.95
  - @jpmorganchase/mosaic-theme@0.1.0-beta.95

## 0.1.0-beta.94

### Patch Changes

- Updated dependencies [da178f8f]
  - @jpmorganchase/mosaic-components@0.1.0-beta.94
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.94
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.94
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.94
  - @jpmorganchase/mosaic-store@0.1.0-beta.94
  - @jpmorganchase/mosaic-theme@0.1.0-beta.94

## 0.1.0-beta.93

### Patch Changes

- 699e570b: Refactored to remove node-fetch.
  - @jpmorganchase/mosaic-components@0.1.0-beta.93
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.93
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.93
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.93
  - @jpmorganchase/mosaic-store@0.1.0-beta.93
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
  - @jpmorganchase/mosaic-components@0.1.0-beta.92
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.92
  - @jpmorganchase/mosaic-theme@0.1.0-beta.92
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.92
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.92
  - @jpmorganchase/mosaic-store@0.1.0-beta.92

## 0.1.0-beta.91

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.91
- @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.91
- @jpmorganchase/mosaic-open-api-component@0.1.0-beta.91
- @jpmorganchase/mosaic-site-middleware@0.1.0-beta.91
- @jpmorganchase/mosaic-store@0.1.0-beta.91
- @jpmorganchase/mosaic-theme@0.1.0-beta.91

## 0.1.0-beta.90

### Minor Changes

- 61180b78: Removed `@jpmorganchase/mosaic-labs-components`.

### Patch Changes

- Updated dependencies [e2821e10]
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.90
  - @jpmorganchase/mosaic-components@0.1.0-beta.90
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.90
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.90
  - @jpmorganchase/mosaic-store@0.1.0-beta.90
  - @jpmorganchase/mosaic-theme@0.1.0-beta.90

## 0.1.0-beta.89

### Patch Changes

- 948e5194: Fixed pages with breadcrumbs having an empty breadcrumb meta
  - @jpmorganchase/mosaic-components@0.1.0-beta.89
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.89
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.89
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.89
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.89
  - @jpmorganchase/mosaic-store@0.1.0-beta.89
  - @jpmorganchase/mosaic-theme@0.1.0-beta.89

## 0.1.0-beta.88

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.88
- @jpmorganchase/mosaic-labs-components@0.1.0-beta.88
- @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.88
- @jpmorganchase/mosaic-open-api-component@0.1.0-beta.88
- @jpmorganchase/mosaic-site-middleware@0.1.0-beta.88
- @jpmorganchase/mosaic-store@0.1.0-beta.88
- @jpmorganchase/mosaic-theme@0.1.0-beta.88

## 0.1.0-beta.87

### Patch Changes

- Updated dependencies [dca2d049]
  - @jpmorganchase/mosaic-theme@0.1.0-beta.87
  - @jpmorganchase/mosaic-components@0.1.0-beta.87
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.87
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.87
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.87
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.87
  - @jpmorganchase/mosaic-store@0.1.0-beta.87

## 0.1.0-beta.86

### Patch Changes

- 9124a6c0: Relax navigation width condition for different responsive usage
- Updated dependencies [9124a6c0]
- Updated dependencies [bb1189a1]
  - @jpmorganchase/mosaic-store@0.1.0-beta.86
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.86
  - @jpmorganchase/mosaic-theme@0.1.0-beta.86
  - @jpmorganchase/mosaic-components@0.1.0-beta.86
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.86
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.86
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.86

## 0.1.0-beta.85

### Patch Changes

- Updated dependencies [e6104310]
  - @jpmorganchase/mosaic-theme@0.1.0-beta.85
  - @jpmorganchase/mosaic-components@0.1.0-beta.85
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.85
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.85
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.85
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.85
  - @jpmorganchase/mosaic-store@0.1.0-beta.85

## 0.1.0-beta.84

### Patch Changes

- Updated dependencies [49cbe9fd]
  - @jpmorganchase/mosaic-components@0.1.0-beta.84
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.84
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.84
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.84
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.84
  - @jpmorganchase/mosaic-store@0.1.0-beta.84
  - @jpmorganchase/mosaic-theme@0.1.0-beta.84

## 0.1.0-beta.83

### Minor Changes

- 182a4307: Refactor Breadcrumbs to remove usage of lab components.
  Fixed non-unique key error in AppHeaderControls.

### Patch Changes

- 8e96ed0c: Updated Salt packages.
- Updated dependencies [24551c8d]
- Updated dependencies [8e96ed0c]
  - @jpmorganchase/mosaic-components@0.1.0-beta.83
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.83
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.83
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.83
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.83
  - @jpmorganchase/mosaic-store@0.1.0-beta.83
  - @jpmorganchase/mosaic-theme@0.1.0-beta.83

## 0.1.0-beta.82

### Patch Changes

- Updated dependencies [fb689099]
  - @jpmorganchase/mosaic-components@0.1.0-beta.82
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.82
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.82
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.82
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.82
  - @jpmorganchase/mosaic-store@0.1.0-beta.82
  - @jpmorganchase/mosaic-theme@0.1.0-beta.82

## 0.1.0-beta.81

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.81
- @jpmorganchase/mosaic-labs-components@0.1.0-beta.81
- @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.81
- @jpmorganchase/mosaic-open-api-component@0.1.0-beta.81
- @jpmorganchase/mosaic-site-middleware@0.1.0-beta.81
- @jpmorganchase/mosaic-store@0.1.0-beta.81
- @jpmorganchase/mosaic-theme@0.1.0-beta.81

## 0.1.0-beta.80

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.80
- @jpmorganchase/mosaic-labs-components@0.1.0-beta.80
- @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.80
- @jpmorganchase/mosaic-open-api-component@0.1.0-beta.80
- @jpmorganchase/mosaic-site-middleware@0.1.0-beta.80
- @jpmorganchase/mosaic-store@0.1.0-beta.80
- @jpmorganchase/mosaic-theme@0.1.0-beta.80

## 0.1.0-beta.79

### Patch Changes

- 385d5e4f: Fixed `VerticalNavigation` not showing active for group with hidden items
- 26d55980: Remove fragments from DocPaginator to stop React logging an error
- Updated dependencies [244ed5c3]
  - @jpmorganchase/mosaic-components@0.1.0-beta.79
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.79
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.79
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.79
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.79
  - @jpmorganchase/mosaic-store@0.1.0-beta.79
  - @jpmorganchase/mosaic-theme@0.1.0-beta.79

## 0.1.0-beta.78

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.78
- @jpmorganchase/mosaic-labs-components@0.1.0-beta.78
- @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.78
- @jpmorganchase/mosaic-open-api-component@0.1.0-beta.78
- @jpmorganchase/mosaic-site-middleware@0.1.0-beta.78
- @jpmorganchase/mosaic-store@0.1.0-beta.78
- @jpmorganchase/mosaic-theme@0.1.0-beta.78

## 0.1.0-beta.77

### Patch Changes

- 3cc2ea94: handle Vertical Navigation edge cases

  - Vertical Navigation groups containing single pages should render as links rather than expandable rows
  - configured page extensions were ignored by page filter
  - @jpmorganchase/mosaic-components@0.1.0-beta.77
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.77
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.77
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.77
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.77
  - @jpmorganchase/mosaic-store@0.1.0-beta.77
  - @jpmorganchase/mosaic-theme@0.1.0-beta.77

## 0.1.0-beta.76

### Patch Changes

- 727fcd54: feat: align to Salt Vertical Navigation pattern

  - groups now expand and collapse and do not select a route
  - sidebar group label can be defined through frontmatter `sidebar.groupLabel`
  - breadcrumbs do not display the root page
  - pagination now steps through all pages within the user journey
  - paginator buttons show the group, as well as the page title

- Updated dependencies [727fcd54]
  - @jpmorganchase/mosaic-store@0.1.0-beta.76
  - @jpmorganchase/mosaic-components@0.1.0-beta.76
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.76
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.76
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.76
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.76
  - @jpmorganchase/mosaic-theme@0.1.0-beta.76

## 0.1.0-beta.75

### Patch Changes

- fd6d715d: - Tactical fix to remove `react-pro-sidebar` and replace with Salt's `NavigationItem`. We will remove this local `NavigationItem` once Salt merges it's own PR.
- Updated dependencies [ffc03a18]
- Updated dependencies [fd6d715d]
  - @jpmorganchase/mosaic-components@0.1.0-beta.75
  - @jpmorganchase/mosaic-theme@0.1.0-beta.75
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.75
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.75
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.75
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.75
  - @jpmorganchase/mosaic-store@0.1.0-beta.75

## 0.1.0-beta.74

### Patch Changes

- 2d4e5616: Pipped Salt DS to @salt-ds/core 1.26.0
- Updated dependencies [2d4e5616]
  - @jpmorganchase/mosaic-components@0.1.0-beta.74
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.74
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.74
  - @jpmorganchase/mosaic-theme@0.1.0-beta.74
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.74
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.74
  - @jpmorganchase/mosaic-store@0.1.0-beta.74

## 0.1.0-beta.73

### Patch Changes

- de00c017: Added the files package.json field to all of the packages to prevent unnecessary files being published.
- Updated dependencies [de00c017]
  - @jpmorganchase/mosaic-components@0.1.0-beta.73
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.73
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.73
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.73
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.73
  - @jpmorganchase/mosaic-store@0.1.0-beta.73
  - @jpmorganchase/mosaic-theme@0.1.0-beta.73

## 0.1.0-beta.72

### Patch Changes

- e5d14ab4: Upgraded Salt packages to:

  @salt-ds/core@1.22.0
  @salt-ds/lab@1.0.0-alpha.38
  @salt-ds/theme@1.13.1

- Updated dependencies [e5d14ab4]
  - @jpmorganchase/mosaic-components@0.1.0-beta.72
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.72
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.72
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.72
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.72
  - @jpmorganchase/mosaic-store@0.1.0-beta.72
  - @jpmorganchase/mosaic-theme@0.1.0-beta.72

## 0.1.0-beta.71

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.71
- @jpmorganchase/mosaic-labs-components@0.1.0-beta.71
- @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.71
- @jpmorganchase/mosaic-open-api-component@0.1.0-beta.71
- @jpmorganchase/mosaic-site-middleware@0.1.0-beta.71
- @jpmorganchase/mosaic-store@0.1.0-beta.71
- @jpmorganchase/mosaic-theme@0.1.0-beta.71

## 0.1.0-beta.70

### Patch Changes

- dca7f2dc: Fix logo color in dark mode

  The intention is that we use a `.svg` for logo, when you toggle to dark mode
  the colors are inverted.

  - @jpmorganchase/mosaic-components@0.1.0-beta.70
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.70
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.70
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.70
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.70
  - @jpmorganchase/mosaic-store@0.1.0-beta.70
  - @jpmorganchase/mosaic-theme@0.1.0-beta.70

## 0.1.0-beta.69

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.69
- @jpmorganchase/mosaic-labs-components@0.1.0-beta.69
- @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.69
- @jpmorganchase/mosaic-open-api-component@0.1.0-beta.69
- @jpmorganchase/mosaic-site-middleware@0.1.0-beta.69
- @jpmorganchase/mosaic-store@0.1.0-beta.69
- @jpmorganchase/mosaic-theme@0.1.0-beta.69

## 0.1.0-beta.68

### Patch Changes

- 579a8be5: Fixed hydration issues with table of contents
  - @jpmorganchase/mosaic-components@0.1.0-beta.68
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.68
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.68
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.68
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.68
  - @jpmorganchase/mosaic-store@0.1.0-beta.68
  - @jpmorganchase/mosaic-theme@0.1.0-beta.68

## 0.1.0-beta.67

### Patch Changes

- 6abf1910: Fixed table of contents indentation
  - @jpmorganchase/mosaic-components@0.1.0-beta.67
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.67
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.67
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.67
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.67
  - @jpmorganchase/mosaic-store@0.1.0-beta.67
  - @jpmorganchase/mosaic-theme@0.1.0-beta.67

## 0.1.0-beta.66

### Patch Changes

- 127ba397: Refactored TableOfContents to use Salt's NavigationItem
  - @jpmorganchase/mosaic-components@0.1.0-beta.66
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.66
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.66
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.66
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.66
  - @jpmorganchase/mosaic-store@0.1.0-beta.66
  - @jpmorganchase/mosaic-theme@0.1.0-beta.66

## 0.1.0-beta.65

### Patch Changes

- Updated dependencies [abe4f6c8]
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.65
  - @jpmorganchase/mosaic-components@0.1.0-beta.65
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.65
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.65
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.65
  - @jpmorganchase/mosaic-store@0.1.0-beta.65
  - @jpmorganchase/mosaic-theme@0.1.0-beta.65

## 0.1.0-beta.64

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.64
- @jpmorganchase/mosaic-labs-components@0.1.0-beta.64
- @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.64
- @jpmorganchase/mosaic-open-api-component@0.1.0-beta.64
- @jpmorganchase/mosaic-site-middleware@0.1.0-beta.64
- @jpmorganchase/mosaic-store@0.1.0-beta.64
- @jpmorganchase/mosaic-theme@0.1.0-beta.64

## 0.1.0-beta.63

### Patch Changes

- Updated dependencies [680eb0eb]
  - @jpmorganchase/mosaic-components@0.1.0-beta.63
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.63
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.63
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.63
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.63
  - @jpmorganchase/mosaic-store@0.1.0-beta.63
  - @jpmorganchase/mosaic-theme@0.1.0-beta.63

## 0.1.0-beta.62

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.62
- @jpmorganchase/mosaic-labs-components@0.1.0-beta.62
- @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.62
- @jpmorganchase/mosaic-open-api-component@0.1.0-beta.62
- @jpmorganchase/mosaic-site-middleware@0.1.0-beta.62
- @jpmorganchase/mosaic-store@0.1.0-beta.62
- @jpmorganchase/mosaic-theme@0.1.0-beta.62

## 0.1.0-beta.61

### Patch Changes

- cec89401: add `pluginTimeout` (20 secs) to fastify to prevent loading timeout
- Updated dependencies [cec89401]
  - @jpmorganchase/mosaic-components@0.1.0-beta.61
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.61
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.61
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.61
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.61
  - @jpmorganchase/mosaic-store@0.1.0-beta.61
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
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.60
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.60
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.60
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.60
  - @jpmorganchase/mosaic-store@0.1.0-beta.60
  - @jpmorganchase/mosaic-theme@0.1.0-beta.60

## 0.1.0-beta.59

### Patch Changes

- Updated dependencies [e3f4b7c3]
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.59
  - @jpmorganchase/mosaic-components@0.1.0-beta.59
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.59
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.59
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.59
  - @jpmorganchase/mosaic-store@0.1.0-beta.59
  - @jpmorganchase/mosaic-theme@0.1.0-beta.59

## 0.1.0-beta.58

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.58
- @jpmorganchase/mosaic-labs-components@0.1.0-beta.58
- @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.58
- @jpmorganchase/mosaic-open-api-component@0.1.0-beta.58
- @jpmorganchase/mosaic-site-middleware@0.1.0-beta.58
- @jpmorganchase/mosaic-store@0.1.0-beta.58
- @jpmorganchase/mosaic-theme@0.1.0-beta.58

## 0.1.0-beta.57

### Patch Changes

- d214d112: Add catch-all default exports for

  - `@jpmorganchase/mosaic-store`
  - `@jpmorganchase/mosaic-theme`
  - `@jpmorganchase/mosaic-workflows`

  This resolves an issue when running tests from an external repo which depends on these packages

- Updated dependencies [d214d112]
  - @jpmorganchase/mosaic-store@0.1.0-beta.57
  - @jpmorganchase/mosaic-theme@0.1.0-beta.57
  - @jpmorganchase/mosaic-components@0.1.0-beta.57
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.57
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.57
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.57
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.57

## 0.1.0-beta.56

### Patch Changes

- 6d30e29f: Add new Storybook source

  Storybook stories can be extracted from Storybook and embedded into Mosaic pages.

  The stories are extracted based on a configured filter or matching tags.

  With a page created for each Story, the author can create a dynamic index of matching stories.

  eg. An index of patterns which match a specific tag

- Updated dependencies [6d30e29f]
  - @jpmorganchase/mosaic-components@0.1.0-beta.56
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.56
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.56
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.56
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.56
  - @jpmorganchase/mosaic-store@0.1.0-beta.56
  - @jpmorganchase/mosaic-theme@0.1.0-beta.56

## 0.1.0-beta.55

### Minor Changes

- 3dd27378: Upgraded Salt packages to:

  @salt-ds/core@1.11.0
  @salt-ds/lab@1.0.0-alpha.20
  @salt-ds/icons@1.7.0
  @salt-ds/theme@1.9.0

### Patch Changes

- Updated dependencies [3dd27378]
  - @jpmorganchase/mosaic-components@0.1.0-beta.55
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.55
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.55
  - @jpmorganchase/mosaic-theme@0.1.0-beta.55
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.55
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.55
  - @jpmorganchase/mosaic-store@0.1.0-beta.55

## 0.1.0-beta.54

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.54
- @jpmorganchase/mosaic-labs-components@0.1.0-beta.54
- @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.54
- @jpmorganchase/mosaic-open-api-component@0.1.0-beta.54
- @jpmorganchase/mosaic-site-middleware@0.1.0-beta.54
- @jpmorganchase/mosaic-store@0.1.0-beta.54
- @jpmorganchase/mosaic-theme@0.1.0-beta.54

## 0.1.0-beta.53

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.53
- @jpmorganchase/mosaic-labs-components@0.1.0-beta.53
- @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.53
- @jpmorganchase/mosaic-open-api-component@0.1.0-beta.53
- @jpmorganchase/mosaic-site-middleware@0.1.0-beta.53
- @jpmorganchase/mosaic-store@0.1.0-beta.53
- @jpmorganchase/mosaic-theme@0.1.0-beta.53

## 0.1.0-beta.52

### Patch Changes

- 9ad7418c: Use a websocket for workflows
- Updated dependencies [9ad7418c]
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.52
  - @jpmorganchase/mosaic-components@0.1.0-beta.52
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.52
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.52
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.52
  - @jpmorganchase/mosaic-store@0.1.0-beta.52
  - @jpmorganchase/mosaic-theme@0.1.0-beta.52

## 0.1.0-beta.51

### Patch Changes

- Updated dependencies [56bbad4b]
  - @jpmorganchase/mosaic-components@0.1.0-beta.51
  - @jpmorganchase/mosaic-theme@0.1.0-beta.51
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.51
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.51
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.51
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.51
  - @jpmorganchase/mosaic-store@0.1.0-beta.51

## 0.1.0-beta.50

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.50
- @jpmorganchase/mosaic-labs-components@0.1.0-beta.50
- @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.50
- @jpmorganchase/mosaic-open-api-component@0.1.0-beta.50
- @jpmorganchase/mosaic-site-middleware@0.1.0-beta.50
- @jpmorganchase/mosaic-store@0.1.0-beta.50
- @jpmorganchase/mosaic-theme@0.1.0-beta.50

## 0.1.0-beta.49

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.49
- @jpmorganchase/mosaic-labs-components@0.1.0-beta.49
- @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.49
- @jpmorganchase/mosaic-open-api-component@0.1.0-beta.49
- @jpmorganchase/mosaic-site-middleware@0.1.0-beta.49
- @jpmorganchase/mosaic-store@0.1.0-beta.49
- @jpmorganchase/mosaic-theme@0.1.0-beta.49

## 0.1.0-beta.48

### Patch Changes

- Updated dependencies [eb085d3d]
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.48
  - @jpmorganchase/mosaic-components@0.1.0-beta.48
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.48
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.48
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.48
  - @jpmorganchase/mosaic-store@0.1.0-beta.48
  - @jpmorganchase/mosaic-theme@0.1.0-beta.48

## 0.1.0-beta.47

### Patch Changes

- Updated dependencies [5abe7fdf]
- Updated dependencies [19b4e49a]
  - @jpmorganchase/mosaic-components@0.1.0-beta.47
  - @jpmorganchase/mosaic-store@0.1.0-beta.47
  - @jpmorganchase/mosaic-theme@0.1.0-beta.47
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.47
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.47
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.47
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.47

## 0.1.0-beta.46

### Patch Changes

- 32e86cfd: ## Fix

  When a page does not specify a property that is part of the store default props, we use what the default props specify and not what is currently in the store.

- c59db0f1: Fix: Ensure sidebar does not break when it is given bad config
- Updated dependencies [32e86cfd]
  - @jpmorganchase/mosaic-store@0.1.0-beta.46
  - @jpmorganchase/mosaic-components@0.1.0-beta.46
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.46
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.46
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.46
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.46
  - @jpmorganchase/mosaic-theme@0.1.0-beta.46

## 0.1.0-beta.45

### Patch Changes

- Updated dependencies [020ae58d]
  - @jpmorganchase/mosaic-components@0.1.0-beta.45
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.45
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.45
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.45
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.45
  - @jpmorganchase/mosaic-store@0.1.0-beta.45
  - @jpmorganchase/mosaic-theme@0.1.0-beta.45

## 0.1.0-beta.44

### Patch Changes

- 20bab77: ## Feat

  Navigating away from a broken page will reset the error status.

  This gives more independence to pages, one broken page does not impact the ability to view the other pages on the site.

- Updated dependencies [cc5183e]
- Updated dependencies [36896ac]
  - @jpmorganchase/mosaic-components@0.1.0-beta.44
  - @jpmorganchase/mosaic-theme@0.1.0-beta.44
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.44
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.44
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.44
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.44
  - @jpmorganchase/mosaic-store@0.1.0-beta.44

## 0.1.0-beta.43

### Patch Changes

- c0ee0f3: ### Fixes

  - Breadcrumb label matches sidebar label if available.
  - When breadcrumbs collapse into a menu button, the breadcrumb label is used for the menu items.
  - Collapsed breadcrumbs will navigate to the page the breadcrumb represents
  - Breadcrumb links no longer include the unnecessary file extension

- Updated dependencies [0dc621d]
- Updated dependencies [4e69178]
  - @jpmorganchase/mosaic-components@0.1.0-beta.43
  - @jpmorganchase/mosaic-theme@0.1.0-beta.43
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.43
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.43
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.43
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.43
  - @jpmorganchase/mosaic-store@0.1.0-beta.43

## 0.1.0-beta.42

### Patch Changes

- Updated dependencies [3491f29]
  - @jpmorganchase/mosaic-components@0.1.0-beta.42
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.42
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.42
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.42
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.42
  - @jpmorganchase/mosaic-store@0.1.0-beta.42
  - @jpmorganchase/mosaic-theme@0.1.0-beta.42

## 0.1.0-beta.41

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.41
- @jpmorganchase/mosaic-labs-components@0.1.0-beta.41
- @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.41
- @jpmorganchase/mosaic-open-api-component@0.1.0-beta.41
- @jpmorganchase/mosaic-site-middleware@0.1.0-beta.41
- @jpmorganchase/mosaic-store@0.1.0-beta.41
- @jpmorganchase/mosaic-theme@0.1.0-beta.41

## 0.1.0-beta.40

### Patch Changes

- 8265ce3: Design fixes:

  - App Header spacing and responsive behavior
  - Spacing of Tabs in `Tabs` component
  - `Link` component external link icon size
  - `TileContent` label styling
  - Restore icons to `FilterToolbar` sort and filter dropdowns

  Fixes:

  - Sidebar fixed so that it works inside the drawer on smaller screen sizes
  - `$RefPlugin` will merge page metadata but only after refs have been expanded
  - @jpmorganchase/mosaic-components@0.1.0-beta.40
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.40
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.40
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.40
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.40
  - @jpmorganchase/mosaic-store@0.1.0-beta.40
  - @jpmorganchase/mosaic-theme@0.1.0-beta.40

## 0.1.0-beta.39

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.39
- @jpmorganchase/mosaic-labs-components@0.1.0-beta.39
- @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.39
- @jpmorganchase/mosaic-open-api-component@0.1.0-beta.39
- @jpmorganchase/mosaic-site-middleware@0.1.0-beta.39
- @jpmorganchase/mosaic-store@0.1.0-beta.39
- @jpmorganchase/mosaic-theme@0.1.0-beta.39

## 0.1.0-beta.38

### Patch Changes

- dc993df: Styling and API changes for In-Browser Content Editor (IBCE)
- Updated dependencies [18f7a0b]
- Updated dependencies [dc993df]
  - @jpmorganchase/mosaic-theme@0.1.0-beta.38
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.38
  - @jpmorganchase/mosaic-components@0.1.0-beta.38
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.38
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.38
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.38
  - @jpmorganchase/mosaic-store@0.1.0-beta.38

## 0.1.0-beta.37

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.37
- @jpmorganchase/mosaic-labs-components@0.1.0-beta.37
- @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.37
- @jpmorganchase/mosaic-open-api-component@0.1.0-beta.37
- @jpmorganchase/mosaic-site-middleware@0.1.0-beta.37
- @jpmorganchase/mosaic-store@0.1.0-beta.37
- @jpmorganchase/mosaic-theme@0.1.0-beta.37

## 0.1.0-beta.36

### Patch Changes

- Updated dependencies [03464ad]
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.36
  - @jpmorganchase/mosaic-components@0.1.0-beta.36
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.36
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.36
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.36
  - @jpmorganchase/mosaic-store@0.1.0-beta.36
  - @jpmorganchase/mosaic-theme@0.1.0-beta.36

## 0.1.0-beta.35

### Patch Changes

- 00a9408: Use `next/font` to load fonts
  - @jpmorganchase/mosaic-components@0.1.0-beta.35
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.35
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.35
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.35
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.35
  - @jpmorganchase/mosaic-store@0.1.0-beta.35
  - @jpmorganchase/mosaic-theme@0.1.0-beta.35

## 0.1.0-beta.34

### Patch Changes

- 3d117d3: Upgrade to latest Salt libraries
- Updated dependencies [3d117d3]
  - @jpmorganchase/mosaic-components@0.1.0-beta.34
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.34
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.34
  - @jpmorganchase/mosaic-theme@0.1.0-beta.34
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.34
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.34
  - @jpmorganchase/mosaic-store@0.1.0-beta.34

## 0.1.0-beta.33

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.33
- @jpmorganchase/mosaic-labs-components@0.1.0-beta.33
- @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.33
- @jpmorganchase/mosaic-open-api-component@0.1.0-beta.33
- @jpmorganchase/mosaic-site-middleware@0.1.0-beta.33
- @jpmorganchase/mosaic-store@0.1.0-beta.33
- @jpmorganchase/mosaic-theme@0.1.0-beta.33

## 0.1.0-beta.32

### Patch Changes

- 7ed1ee7: Upgrade to latest version of NextJs (v13.4.1)
- 6265b19: Upgrade to latest Salt libraries
- 8c854fd: - Upgrade `next-auth` version
  - Update `withSession` mosaic middleware to use `next-auth`
- Updated dependencies [7ed1ee7]
- Updated dependencies [6265b19]
- Updated dependencies [8c854fd]
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.32
  - @jpmorganchase/mosaic-components@0.1.0-beta.32
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.32
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.32
  - @jpmorganchase/mosaic-theme@0.1.0-beta.32
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.32
  - @jpmorganchase/mosaic-store@0.1.0-beta.32

## 0.1.0-beta.31

### Minor Changes

- a73fb9f: Check if window exists before accessing document in table of contents utils

### Patch Changes

- b609fd0: Added support for containerization of the site and cli as well as providing config for kubernetes development (skaffold)

  ## @jpmorganchase/mosaic-cli

  The cli package has been updated to support containerization.

- Updated dependencies [b609fd0]
- Updated dependencies [d04fb1e]
  - @jpmorganchase/mosaic-components@0.1.0-beta.31
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.31
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.31
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.31
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.31
  - @jpmorganchase/mosaic-store@0.1.0-beta.31
  - @jpmorganchase/mosaic-theme@0.1.0-beta.31

## 0.1.0-beta.30

### Patch Changes

- 18ef436: The git repo source no longer generates a double slash between the repo host and repo path.
- Updated dependencies [18ef436]
  - @jpmorganchase/mosaic-components@0.1.0-beta.30
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.30
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.30
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.30
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.30
  - @jpmorganchase/mosaic-store@0.1.0-beta.30
  - @jpmorganchase/mosaic-theme@0.1.0-beta.30

## 0.1.0-beta.29

### Minor Changes

- c78deb4: Flatten Sidebar
  Search Optimisation
  Public Assets Plugin
  TOC Indentation

### Patch Changes

- 41799f3: Pass alt to Image if fill or width and height are not defined
- Updated dependencies [c78deb4]
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.29
  - @jpmorganchase/mosaic-components@0.1.0-beta.29
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.29
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.29
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.29
  - @jpmorganchase/mosaic-store@0.1.0-beta.29
  - @jpmorganchase/mosaic-theme@0.1.0-beta.29

## 0.1.0-beta.28

### Patch Changes

- 27ac914: 1. Layout improvements. 2. Fix: if a user hits a url that lands on a directory, the index file within that directory is resolved as the content. 3. Fix: improve Table of Contents component highlighting.
- Updated dependencies [27ac914]
  - @jpmorganchase/mosaic-components@0.1.0-beta.28
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.28
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.28
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.28
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.28
  - @jpmorganchase/mosaic-store@0.1.0-beta.28
  - @jpmorganchase/mosaic-theme@0.1.0-beta.28

## 0.1.0-beta.27

### Patch Changes

- 0a672d4: Pin @salt-ds/lab to 1.0.0-alpha.1
- b465413: Improvements to vercel deployments
- Updated dependencies [0a672d4]
- Updated dependencies [b465413]
  - @jpmorganchase/mosaic-components@0.1.0-beta.27
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.27
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.27
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.27
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.27
  - @jpmorganchase/mosaic-store@0.1.0-beta.27
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
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.26
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.26
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.26
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.26
  - @jpmorganchase/mosaic-store@0.1.0-beta.26

## 0.1.0-beta.25

### Minor Changes

- 93e9b07: The theme contract provided by the `@jpmorganchase/mosaic-theme` package now uses locally scoped variable names via a Vanilla Extract [Theme Contract](https://vanilla-extract.style/documentation/api/create-theme-contract/). Previously the theme variables were globally scoped resulting in conflicts with other design systems.

### Patch Changes

- a36219c: - Next/Prev page buttons were not appearing at the bottom of a page sequence
  - Removed redundant snapshot page api
- Updated dependencies [a36219c]
- Updated dependencies [93e9b07]
  - @jpmorganchase/mosaic-store@0.1.0-beta.25
  - @jpmorganchase/mosaic-components@0.1.0-beta.25
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.25
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.25
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.25
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.25
  - @jpmorganchase/mosaic-theme@0.1.0-beta.25

## 0.1.0-beta.24

### Patch Changes

- 049d9af: 1. Pip Salt version 2. Issues 155, make 500 error more specific 3. button and sidebar styles 4. search opt-out
- Updated dependencies [049d9af]
  - @jpmorganchase/mosaic-components@0.1.0-beta.24
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.24
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.24
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.24
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.24
  - @jpmorganchase/mosaic-store@0.1.0-beta.24
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
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.23
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.23
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.23
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.23
  - @jpmorganchase/mosaic-store@0.1.0-beta.23
  - @jpmorganchase/mosaic-theme@0.1.0-beta.23

## 0.1.0-beta.22

### Patch Changes

- be89e4f: fix markdown tables and update generator's Salt patches

  - Salt patches in generator were out of sync with Mosaic repo
  - Markdown now support github flavoured markdown, such as Tables

- Updated dependencies [be89e4f]
  - @jpmorganchase/mosaic-components@0.1.0-beta.22
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.22
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.22
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.22
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.22
  - @jpmorganchase/mosaic-store@0.1.0-beta.22
  - @jpmorganchase/mosaic-theme@0.1.0-beta.22

## 0.1.0-beta.21

### Patch Changes

- f75fd5e: fix sidebar which was generated after `beforeSend` had completed
- Updated dependencies [f75fd5e]
  - @jpmorganchase/mosaic-components@0.1.0-beta.21
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.21
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.21
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.21
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.21
  - @jpmorganchase/mosaic-store@0.1.0-beta.21
  - @jpmorganchase/mosaic-theme@0.1.0-beta.21

## 0.1.0-beta.20

### Patch Changes

- 9c7b8ff: pip to beta.20
- Updated dependencies [9c7b8ff]
  - @jpmorganchase/mosaic-components@0.1.0-beta.20
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.20
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.20
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.20
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.20
  - @jpmorganchase/mosaic-store@0.1.0-beta.20
  - @jpmorganchase/mosaic-theme@0.1.0-beta.20

## 0.1.0-beta.19

### Patch Changes

- ad06d4c: ensure spinner is removed after page has loaded
- Updated dependencies [ad06d4c]
  - @jpmorganchase/mosaic-components@0.1.0-beta.19
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.19
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.19
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.19
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.19
  - @jpmorganchase/mosaic-store@0.1.0-beta.19
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
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.18
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.18
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.18
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.18
  - @jpmorganchase/mosaic-store@0.1.0-beta.18
  - @jpmorganchase/mosaic-theme@0.1.0-beta.18

## 0.1.0-beta.17

### Patch Changes

- b2f6d52: Fix `pre` block code block rendering
- Updated dependencies [b2f6d52]
  - @jpmorganchase/mosaic-components@0.1.0-beta.17
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.17
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.17
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.17
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.17
  - @jpmorganchase/mosaic-store@0.1.0-beta.17
  - @jpmorganchase/mosaic-theme@0.1.0-beta.17

## 0.1.0-beta.16

### Patch Changes

- 3a5c88a: add missing `@types/node` dependency for generator
- Updated dependencies [3a5c88a]
  - @jpmorganchase/mosaic-components@0.1.0-beta.16
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.16
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.16
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.16
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.16
  - @jpmorganchase/mosaic-store@0.1.0-beta.16
  - @jpmorganchase/mosaic-theme@0.1.0-beta.16

## 0.1.0-beta.15

### Patch Changes

- aaaf255: initial release of HTTP Source package.

  An HTTP source accepts a collection of endpoints and a path to a transformer module.
  The response from fetching is transformed and merged together into 1 single collection of pages.
  Should 1 of the endpoints request fail then it will have no impact on the other requests.

- Updated dependencies [aaaf255]
  - @jpmorganchase/mosaic-components@0.1.0-beta.15
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.15
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.15
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.15
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.15
  - @jpmorganchase/mosaic-store@0.1.0-beta.15
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
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.14
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.14
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.14
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.14
  - @jpmorganchase/mosaic-store@0.1.0-beta.14
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
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.13
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.13
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.13
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.13
  - @jpmorganchase/mosaic-store@0.1.0-beta.13
  - @jpmorganchase/mosaic-theme@0.1.0-beta.13

## 0.1.0-beta.12

### Patch Changes

- 9ec358b: Upgrade React to version 18 and NextJs to version 13
- 3eb35bf: initial work to enable generators to run outside of the repo
- Updated dependencies [9ec358b]
- Updated dependencies [3eb35bf]
  - @jpmorganchase/mosaic-components@0.1.0-beta.12
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.12
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.12
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.12
  - @jpmorganchase/mosaic-store@0.1.0-beta.12
  - @jpmorganchase/mosaic-theme@0.1.0-beta.12
  - @jpmorganchase/mosaic-labs-components@0.1.0-beta.12

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
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.11
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.11
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.11
  - @jpmorganchase/mosaic-store@0.1.0-beta.11
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
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.10
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.10
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.10
  - @jpmorganchase/mosaic-store@0.1.0-beta.10
  - @jpmorganchase/mosaic-theme@0.1.0-beta.10
