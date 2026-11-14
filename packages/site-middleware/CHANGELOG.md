# @jpmorganchase/mosaic-site-middleware

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
- 5476067: Remove the `snapshot-s3` mode and the `mosaic upload` command
  
  S3 snapshot support was unused, so Mosaic now has two content modes,
  `active` and `snapshot-file`, and no longer depends on the AWS SDK.
  
  ### Breaking changes
  
  **`@jpmorganchase/mosaic-cli`**
  
  - `mosaic upload` and its `-S` / `--snapshot` option are removed. The CLI
    no longer depends on `@aws-sdk/client-s3` or `globby`.
  
  **`@jpmorganchase/mosaic-site-middleware`**
  
  - The loaders (`getMdxRaw`, `getSharedConfig`, `getSearchData`,
    `loadSitemap`, …) no longer read snapshots from S3. The package no
    longer depends on `@aws-sdk/client-s3`, `@aws-sdk/types` or `md5`.
  
  **`@jpmorganchase/mosaic-types`**
  
  - `MosaicMode` is now `'active' | 'snapshot-file'`.
  
  **`@jpmorganchase/mosaic-schemas`**
  
  - `snapshotS3EnvSchema` and the `S3LoaderProcessEnv` type are removed. The
    `MOSAIC_S3_BUCKET`, `MOSAIC_S3_REGION`, `MOSAIC_S3_ACCESS_KEY_ID` and
    `MOSAIC_S3_SECRET_ACCESS_KEY` variables are no longer read.
  
  **Reference site (`packages/site`)**
  
  - The `build:static:s3` and `serve:snapshot:s3` scripts are removed (and
    the root `serve:snapshot:s3` script). `next.config.js` refuses any
    `MOSAIC_MODE` other than `active` or `snapshot-file`, so a leftover
    `snapshot-s3` fails at start-up instead of falling back to active-mode
    fetches with no content URL.
  
  ### Migration
  
  Use `snapshot-file` (or `active`) instead of `snapshot-s3`. To keep your
  snapshots in S3, sync the folder yourself:
  
  - Upload after `mosaic build`, for example
    `aws s3 sync snapshots/latest s3://your-bucket`.
  - Download before building the site, for example
    `aws s3 sync s3://your-bucket snapshots/latest`, then set
    `MOSAIC_MODE=snapshot-file` and `MOSAIC_SNAPSHOT_DIR` to that folder,
    relative to the site's folder.

### Minor Changes

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

### Patch Changes

- 2ecdf25: Export `resolveContent` and `canonicalRoute` for App Router documentation hosts. Resolve an alias's shared configuration from its backing document, even when generated MDX has no embedded `sharedConfig`. Keep the public canonical URL separate from `sourcePathname`, so aliases and authored permalinks retain the correct source capabilities, raw-source reads and save target.
  
  The editor now uses an explicit host `route` for save and rename operations while retaining authored public route metadata for preview rendering.
- 0c4d822: Editor: Lexical 0.45 + extension API + new-page flow + UX polish
  
  ## What changed
  
  The in-browser content editor has been substantially reworked. Three
  themes:
  
  1. **Lexical 0.17 → 0.45** — every `@jpmorganchase/mosaic-content-editor-plugin`
     peer dep on `@lexical/*` is bumped to 0.45. Adds `@lexical/extension` as
     the new composition primitive (plugins are still supported; the
     extension API is additive).
  2. **Editor UX polish** — structured MDX error banners with line/column
     hints, save-state pill (`clean` / `dirty` / `saving` / `saved`),
     compile indicator, in-editor error highlighting, source-code editor
     toggle, keyboard shortcuts (+ help dialog), unsaved-changes leave-guard.
  3. **New-page flow** — `?new=1&title=...` query-string contract creates a
     synthesised page anywhere in the route tree without touching the
     filesystem; the New-Page dialog suggests folders/routes from the live
     sitemap and prevents collisions. Cancel navigates back to the parent
     folder (the route doesn't exist on disk) and strips the create flags.
  
  ### Breaking changes (content-editor-plugin)
  
  The plugin's public API has been pruned and rebuilt around per-slice
  context hooks:
  
  - **Removed**: `useContentEditor`, `usePageState`. The module-level
    zustand store backing these is gone. Consumers reading editor state
    must migrate to the new `EditorContext` hooks.
  - **Added**: `EditorProvider`, plus per-slice hooks
    `useEditorUser`, `useErrorMessage`, `useIsCompiling`, `useSetIsCompiling`,
    `useIsInsertingLink`, `useLineMap`, `usePreviewContent`,
    `useSetPreviewContent`, `useSaveState`. Plus `useEditMode` for entering
    /exiting edit mode by URL flag, `NewPageDialog` for the
    create-page launcher (the in-toolbar New Page button mounts this
    internally; exported so integrators can mount their own launcher),
    and `LayoutNamesProvider` + `useLayoutNames` for opting the layout
    picker into the FrontmatterEditor.
  - **Added types**: `EditorUser`, `EditorContextValue`, `LineMapEntry`,
    `SaveState`, `EditMode`, `NewPageDialogProps`, `LayoutNamesProviderProps`.
  
  Migration:
  
  ```diff
  - import { useContentEditor, usePageState } from '@jpmorganchase/mosaic-content-editor-plugin';
  + import {
  +   EditorProvider,
  +   usePreviewContent,
  +   useSaveState,
  + } from '@jpmorganchase/mosaic-content-editor-plugin';
  ```
  
  The new context split means high-frequency preview updates no longer
  re-render the toolbar — consumers that previously called
  `useContentEditor()` and read multiple fields off the result will see
  one render per slice they subscribe to instead of one render per state
  change.
  
  ### Site-middleware additions (non-breaking)
  
  - `loadSitemap()` now supports active mode by fetching `sitemap.xml` from
    the configured `MOSAIC_ACTIVE_MODE_URL`. Returns `[]` (no throw) on
    missing env var, non-OK status, or fetch failure so the New-Page
    dialog degrades to free-text input rather than crashing.
  
  ### Layouts additions (non-breaking)
  
  - `LayoutNamesContext` — provider + hooks (`useLayoutNames`,
    `useLayoutsAreStrict`) used by `FrontmatterEditor` to validate the
    `layout` frontmatter key against the host's registered layouts.
    `useLayoutNames()` returns `null` outside a provider (treated as
    "host did not opt in", plain-text fallback applies).
  - `LayoutProvider` now filters `EditLayout` and undefined slots out of
    the names it publishes; the remaining names are sorted alphabetical so
    the New-Page dialog's layout dropdown is stable.
  
  ### New-page flow (site-side, non-API)
  
  Implementation details live in the reference site:
  `packages/site/src/app/[...route]/newPageTemplate.ts` exports
  `buildNewPageTemplate` (returns frontmatter + body) and `composeTemplate`
  (gray-matter stringify) so integrators can override the seeded template
  per-folder without forking the dialog.
  
  ## Verification
  
  - **30 new unit tests** across the new surfaces: `loadSitemap` active
    branch (4), `deriveFromSitemap` (8), `buildNewPageTemplate` +
    `composeTemplate` (6), `useEditMode.stopEditing` (5),
    `LayoutNamesContext` provider + hooks (7). All passing.
  - **Vitest config extended** to discover `*.test.[jt]s?(x)` under
    `__tests__` in `content-editor-plugin`, `layouts`, and
    `packages/site/src` so future tests in those packages don't need
    another config change.
  - **Bug caught + fixed during test-writing**: the default new-page
    template seeded `layout: 'DetailedTechnical'` (typo); real export is
    `DetailTechnical`. The wrong name silently fell back to the host's
    default layout and tripped the FrontmatterEditor's unknown-layout
    warning. Now correct.
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
- 2a2f07e: Stop Turbopack tracing a whole site into its server output because of snapshot JSON reads. The snapshot path comes from `MOSAIC_SNAPSHOT_DIR`, so the read is now marked with `turbopackIgnore`; include your snapshots with `outputFileTracingIncludes`, as the Vercel publishing guide describes.
- 168391e: Replace `gray-matter` with YAML-only front matter parsing, exported as `parseFrontmatter` and `stringifyFrontmatter` from `@jpmorganchase/mosaic-serialisers/frontmatter`. `gray-matter` evaluates `---js` front matter, so anyone who could author content could run code wherever it was parsed. Front matter that declares any language other than YAML is now rejected. YAML front matter parses and saves exactly as before.
- Updated dependencies [b581d8b]
- Updated dependencies [0c4d822]
- Updated dependencies [d1c795e]
- Updated dependencies [2ecdf25]
- Updated dependencies [5476067]
- Updated dependencies [915b9ae]
- Updated dependencies [915b9ae]
- Updated dependencies [168391e]
- Updated dependencies [41e8af3]
- Updated dependencies [5d69155]
- Updated dependencies [168391e]
  - @jpmorganchase/mosaic-types@1.0.0-beta.99
  - @jpmorganchase/mosaic-serialisers@1.0.0-beta.99
  - @jpmorganchase/mosaic-schemas@1.0.0-beta.99
  - @jpmorganchase/mosaic-store@1.0.0-beta.99

## 0.1.0-beta.98

### Patch Changes

- b78c699: Update Next.js
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.98
  - @jpmorganchase/mosaic-store@0.1.0-beta.98
  - @jpmorganchase/mosaic-types@0.1.0-beta.98

## 0.1.0-beta.97

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.97
- @jpmorganchase/mosaic-store@0.1.0-beta.97
- @jpmorganchase/mosaic-types@0.1.0-beta.97

## 0.1.0-beta.96

### Patch Changes

- 5e42846: Improved logging by standardizing the prefix
- Updated dependencies [ce408d6]
- Updated dependencies [5e42846]
  - @jpmorganchase/mosaic-types@0.1.0-beta.96
  - @jpmorganchase/mosaic-store@0.1.0-beta.96
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

- Updated dependencies [85bc12f]
- Updated dependencies [18bdd6a]
  - @jpmorganchase/mosaic-store@0.1.0-beta.95
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.95
  - @jpmorganchase/mosaic-types@0.1.0-beta.95

## 0.1.0-beta.94

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.94
- @jpmorganchase/mosaic-store@0.1.0-beta.94
- @jpmorganchase/mosaic-types@0.1.0-beta.94

## 0.1.0-beta.93

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.93
- @jpmorganchase/mosaic-store@0.1.0-beta.93
- @jpmorganchase/mosaic-types@0.1.0-beta.93

## 0.1.0-beta.92

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.92
- @jpmorganchase/mosaic-store@0.1.0-beta.92
- @jpmorganchase/mosaic-types@0.1.0-beta.92

## 0.1.0-beta.91

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.91
- @jpmorganchase/mosaic-store@0.1.0-beta.91
- @jpmorganchase/mosaic-types@0.1.0-beta.91

## 0.1.0-beta.90

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.90
- @jpmorganchase/mosaic-store@0.1.0-beta.90
- @jpmorganchase/mosaic-types@0.1.0-beta.90

## 0.1.0-beta.89

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.89
- @jpmorganchase/mosaic-store@0.1.0-beta.89
- @jpmorganchase/mosaic-types@0.1.0-beta.89

## 0.1.0-beta.88

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.88
- @jpmorganchase/mosaic-store@0.1.0-beta.88
- @jpmorganchase/mosaic-types@0.1.0-beta.88

## 0.1.0-beta.87

### Patch Changes

- Updated dependencies [14942195]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.87
  - @jpmorganchase/mosaic-store@0.1.0-beta.87
  - @jpmorganchase/mosaic-types@0.1.0-beta.87

## 0.1.0-beta.86

### Patch Changes

- Updated dependencies [9124a6c0]
- Updated dependencies [b8361977]
  - @jpmorganchase/mosaic-store@0.1.0-beta.86
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.86
  - @jpmorganchase/mosaic-types@0.1.0-beta.86

## 0.1.0-beta.85

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.85
- @jpmorganchase/mosaic-store@0.1.0-beta.85
- @jpmorganchase/mosaic-types@0.1.0-beta.85

## 0.1.0-beta.84

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.84
- @jpmorganchase/mosaic-store@0.1.0-beta.84
- @jpmorganchase/mosaic-types@0.1.0-beta.84

## 0.1.0-beta.83

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.83
- @jpmorganchase/mosaic-store@0.1.0-beta.83
- @jpmorganchase/mosaic-types@0.1.0-beta.83

## 0.1.0-beta.82

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.82
- @jpmorganchase/mosaic-store@0.1.0-beta.82
- @jpmorganchase/mosaic-types@0.1.0-beta.82

## 0.1.0-beta.81

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.81
- @jpmorganchase/mosaic-store@0.1.0-beta.81
- @jpmorganchase/mosaic-types@0.1.0-beta.81

## 0.1.0-beta.80

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.80
- @jpmorganchase/mosaic-store@0.1.0-beta.80
- @jpmorganchase/mosaic-types@0.1.0-beta.80

## 0.1.0-beta.79

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.79
- @jpmorganchase/mosaic-store@0.1.0-beta.79
- @jpmorganchase/mosaic-types@0.1.0-beta.79

## 0.1.0-beta.78

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.78
- @jpmorganchase/mosaic-store@0.1.0-beta.78
- @jpmorganchase/mosaic-types@0.1.0-beta.78

## 0.1.0-beta.77

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.77
- @jpmorganchase/mosaic-store@0.1.0-beta.77
- @jpmorganchase/mosaic-types@0.1.0-beta.77

## 0.1.0-beta.76

### Patch Changes

- Updated dependencies [727fcd54]
  - @jpmorganchase/mosaic-store@0.1.0-beta.76
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.76
  - @jpmorganchase/mosaic-types@0.1.0-beta.76

## 0.1.0-beta.75

### Patch Changes

- fd6d715d: - Tactical fix to remove `react-pro-sidebar` and replace with Salt's `NavigationItem`. We will remove this local `NavigationItem` once Salt merges it's own PR.
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.75
  - @jpmorganchase/mosaic-store@0.1.0-beta.75
  - @jpmorganchase/mosaic-types@0.1.0-beta.75

## 0.1.0-beta.74

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.74
- @jpmorganchase/mosaic-store@0.1.0-beta.74
- @jpmorganchase/mosaic-types@0.1.0-beta.74

## 0.1.0-beta.73

### Patch Changes

- de00c017: Added the files package.json field to all of the packages to prevent unnecessary files being published.
- Updated dependencies [de00c017]
  - @jpmorganchase/mosaic-store@0.1.0-beta.73
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.73
  - @jpmorganchase/mosaic-types@0.1.0-beta.73

## 0.1.0-beta.72

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.72
- @jpmorganchase/mosaic-store@0.1.0-beta.72
- @jpmorganchase/mosaic-types@0.1.0-beta.72

## 0.1.0-beta.71

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.71
- @jpmorganchase/mosaic-store@0.1.0-beta.71
- @jpmorganchase/mosaic-types@0.1.0-beta.71

## 0.1.0-beta.70

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.70
- @jpmorganchase/mosaic-store@0.1.0-beta.70
- @jpmorganchase/mosaic-types@0.1.0-beta.70

## 0.1.0-beta.69

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.69
- @jpmorganchase/mosaic-store@0.1.0-beta.69
- @jpmorganchase/mosaic-types@0.1.0-beta.69

## 0.1.0-beta.68

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.68
- @jpmorganchase/mosaic-store@0.1.0-beta.68
- @jpmorganchase/mosaic-types@0.1.0-beta.68

## 0.1.0-beta.67

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.67
- @jpmorganchase/mosaic-store@0.1.0-beta.67
- @jpmorganchase/mosaic-types@0.1.0-beta.67

## 0.1.0-beta.66

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.66
- @jpmorganchase/mosaic-store@0.1.0-beta.66
- @jpmorganchase/mosaic-types@0.1.0-beta.66

## 0.1.0-beta.65

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.65
- @jpmorganchase/mosaic-store@0.1.0-beta.65
- @jpmorganchase/mosaic-types@0.1.0-beta.65

## 0.1.0-beta.64

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.64
- @jpmorganchase/mosaic-store@0.1.0-beta.64
- @jpmorganchase/mosaic-types@0.1.0-beta.64

## 0.1.0-beta.63

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.63
- @jpmorganchase/mosaic-store@0.1.0-beta.63
- @jpmorganchase/mosaic-types@0.1.0-beta.63

## 0.1.0-beta.62

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.62
- @jpmorganchase/mosaic-store@0.1.0-beta.62
- @jpmorganchase/mosaic-types@0.1.0-beta.62

## 0.1.0-beta.61

### Patch Changes

- cec89401: add `pluginTimeout` (20 secs) to fastify to prevent loading timeout
- Updated dependencies [cec89401]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.61
  - @jpmorganchase/mosaic-store@0.1.0-beta.61
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
  - @jpmorganchase/mosaic-store@0.1.0-beta.60
  - @jpmorganchase/mosaic-types@0.1.0-beta.60

## 0.1.0-beta.59

### Patch Changes

- e3f4b7c3: Fixed routing breaking when URL parameters are present.
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.59
  - @jpmorganchase/mosaic-store@0.1.0-beta.59
  - @jpmorganchase/mosaic-types@0.1.0-beta.59

## 0.1.0-beta.58

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.58
- @jpmorganchase/mosaic-store@0.1.0-beta.58
- @jpmorganchase/mosaic-types@0.1.0-beta.58

## 0.1.0-beta.57

### Patch Changes

- d214d112: Add catch-all default exports for

  - `@jpmorganchase/mosaic-store`
  - `@jpmorganchase/mosaic-theme`
  - `@jpmorganchase/mosaic-workflows`

  This resolves an issue when running tests from an external repo which depends on these packages

- Updated dependencies [d214d112]
  - @jpmorganchase/mosaic-store@0.1.0-beta.57
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
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.56
  - @jpmorganchase/mosaic-store@0.1.0-beta.56
  - @jpmorganchase/mosaic-types@0.1.0-beta.56

## 0.1.0-beta.55

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.55
- @jpmorganchase/mosaic-store@0.1.0-beta.55
- @jpmorganchase/mosaic-types@0.1.0-beta.55

## 0.1.0-beta.54

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.54
- @jpmorganchase/mosaic-store@0.1.0-beta.54
- @jpmorganchase/mosaic-types@0.1.0-beta.54

## 0.1.0-beta.53

### Patch Changes

- Updated dependencies [d7098baa]
  - @jpmorganchase/mosaic-types@0.1.0-beta.53
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.53
  - @jpmorganchase/mosaic-store@0.1.0-beta.53

## 0.1.0-beta.52

### Patch Changes

- Updated dependencies [9ad7418c]
  - @jpmorganchase/mosaic-types@0.1.0-beta.52
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.52
  - @jpmorganchase/mosaic-store@0.1.0-beta.52

## 0.1.0-beta.51

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.51
- @jpmorganchase/mosaic-store@0.1.0-beta.51
- @jpmorganchase/mosaic-types@0.1.0-beta.51

## 0.1.0-beta.50

### Patch Changes

- Updated dependencies [2f015976]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.50
  - @jpmorganchase/mosaic-store@0.1.0-beta.50
  - @jpmorganchase/mosaic-types@0.1.0-beta.50

## 0.1.0-beta.49

### Patch Changes

- Updated dependencies [425b5a00]
  - @jpmorganchase/mosaic-types@0.1.0-beta.49
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.49
  - @jpmorganchase/mosaic-store@0.1.0-beta.49

## 0.1.0-beta.48

### Patch Changes

- Updated dependencies [0eca1d6e]
  - @jpmorganchase/mosaic-types@0.1.0-beta.48
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.48
  - @jpmorganchase/mosaic-store@0.1.0-beta.48

## 0.1.0-beta.47

### Patch Changes

- Updated dependencies [19b4e49a]
- Updated dependencies [6caa661a]
  - @jpmorganchase/mosaic-store@0.1.0-beta.47
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.47
  - @jpmorganchase/mosaic-types@0.1.0-beta.47

## 0.1.0-beta.46

### Patch Changes

- Updated dependencies [32e86cfd]
  - @jpmorganchase/mosaic-store@0.1.0-beta.46
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.46
  - @jpmorganchase/mosaic-types@0.1.0-beta.46

## 0.1.0-beta.45

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.45
- @jpmorganchase/mosaic-store@0.1.0-beta.45
- @jpmorganchase/mosaic-types@0.1.0-beta.45

## 0.1.0-beta.44

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.44
- @jpmorganchase/mosaic-store@0.1.0-beta.44
- @jpmorganchase/mosaic-types@0.1.0-beta.44

## 0.1.0-beta.43

### Patch Changes

- Updated dependencies [d3b8b3a]
- Updated dependencies [0ced179]
  - @jpmorganchase/mosaic-types@0.1.0-beta.43
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.43
  - @jpmorganchase/mosaic-store@0.1.0-beta.43

## 0.1.0-beta.42

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.42
- @jpmorganchase/mosaic-store@0.1.0-beta.42
- @jpmorganchase/mosaic-types@0.1.0-beta.42

## 0.1.0-beta.41

### Patch Changes

- Updated dependencies [898c9ad]
- Updated dependencies [5cd5a87]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.41
  - @jpmorganchase/mosaic-types@0.1.0-beta.41
  - @jpmorganchase/mosaic-store@0.1.0-beta.41

## 0.1.0-beta.40

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.40
- @jpmorganchase/mosaic-store@0.1.0-beta.40
- @jpmorganchase/mosaic-types@0.1.0-beta.40

## 0.1.0-beta.39

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.39
- @jpmorganchase/mosaic-store@0.1.0-beta.39
- @jpmorganchase/mosaic-types@0.1.0-beta.39

## 0.1.0-beta.38

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.38
- @jpmorganchase/mosaic-store@0.1.0-beta.38
- @jpmorganchase/mosaic-types@0.1.0-beta.38

## 0.1.0-beta.37

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.37
- @jpmorganchase/mosaic-store@0.1.0-beta.37
- @jpmorganchase/mosaic-types@0.1.0-beta.37

## 0.1.0-beta.36

### Patch Changes

- 03464ad: fix: remove env variable check in `withSession` middleware

  The `NEXTAUTH_SECRET` env variable is not always required. It is possible to pass the secret as an option to `next-auth`

  - @jpmorganchase/mosaic-schemas@0.1.0-beta.36
  - @jpmorganchase/mosaic-store@0.1.0-beta.36
  - @jpmorganchase/mosaic-types@0.1.0-beta.36

## 0.1.0-beta.35

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.35
- @jpmorganchase/mosaic-store@0.1.0-beta.35
- @jpmorganchase/mosaic-types@0.1.0-beta.35

## 0.1.0-beta.34

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.34
- @jpmorganchase/mosaic-store@0.1.0-beta.34
- @jpmorganchase/mosaic-types@0.1.0-beta.34

## 0.1.0-beta.33

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.33
- @jpmorganchase/mosaic-store@0.1.0-beta.33
- @jpmorganchase/mosaic-types@0.1.0-beta.33

## 0.1.0-beta.32

### Patch Changes

- 7ed1ee7: Upgrade to latest version of NextJs (v13.4.1)
- 8c854fd: - Upgrade `next-auth` version
  - Update `withSession` mosaic middleware to use `next-auth`
- Updated dependencies [a56eadb]
- Updated dependencies [8c854fd]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.32
  - @jpmorganchase/mosaic-types@0.1.0-beta.32
  - @jpmorganchase/mosaic-store@0.1.0-beta.32

## 0.1.0-beta.31

### Patch Changes

- b609fd0: Added support for containerization of the site and cli as well as providing config for kubernetes development (skaffold)

  ## @jpmorganchase/mosaic-cli

  The cli package has been updated to support containerization.

- Updated dependencies [b609fd0]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.31
  - @jpmorganchase/mosaic-store@0.1.0-beta.31
  - @jpmorganchase/mosaic-types@0.1.0-beta.31

## 0.1.0-beta.30

### Patch Changes

- 18ef436: The git repo source no longer generates a double slash between the repo host and repo path.
- Updated dependencies [18ef436]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.30
  - @jpmorganchase/mosaic-store@0.1.0-beta.30
  - @jpmorganchase/mosaic-types@0.1.0-beta.30

## 0.1.0-beta.29

### Minor Changes

- c78deb4: Flatten Sidebar
  Search Optimisation
  Public Assets Plugin
  TOC Indentation

### Patch Changes

- Updated dependencies [c78deb4]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.29
  - @jpmorganchase/mosaic-store@0.1.0-beta.29
  - @jpmorganchase/mosaic-types@0.1.0-beta.29

## 0.1.0-beta.28

### Patch Changes

- 27ac914: 1. Layout improvements. 2. Fix: if a user hits a url that lands on a directory, the index file within that directory is resolved as the content. 3. Fix: improve Table of Contents component highlighting.
- Updated dependencies [27ac914]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.28
  - @jpmorganchase/mosaic-store@0.1.0-beta.28
  - @jpmorganchase/mosaic-types@0.1.0-beta.28

## 0.1.0-beta.27

### Patch Changes

- b465413: Improvements to vercel deployments
- Updated dependencies [b465413]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.27
  - @jpmorganchase/mosaic-store@0.1.0-beta.27
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
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.26
  - @jpmorganchase/mosaic-store@0.1.0-beta.26
  - @jpmorganchase/mosaic-types@0.1.0-beta.26

## 0.1.0-beta.25

### Minor Changes

- 93e9b07: The theme contract provided by the `@jpmorganchase/mosaic-theme` package now uses locally scoped variable names via a Vanilla Extract [Theme Contract](https://vanilla-extract.style/documentation/api/create-theme-contract/). Previously the theme variables were globally scoped resulting in conflicts with other design systems.

### Patch Changes

- a36219c: - Next/Prev page buttons were not appearing at the bottom of a page sequence
  - Removed redundant snapshot page api
- Updated dependencies [a36219c]
- Updated dependencies [93e9b07]
  - @jpmorganchase/mosaic-store@0.1.0-beta.25
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.25
  - @jpmorganchase/mosaic-types@0.1.0-beta.25

## 0.1.0-beta.24

### Patch Changes

- 049d9af: 1. Pip Salt version 2. Issues 155, make 500 error more specific 3. button and sidebar styles 4. search opt-out
- Updated dependencies [049d9af]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.24
  - @jpmorganchase/mosaic-store@0.1.0-beta.24
  - @jpmorganchase/mosaic-types@0.1.0-beta.24

## 0.1.0-beta.23

### Patch Changes

- 513d45f: Sidebar behavior and styling changes.
  Add Client-side search feature.
  Relax node engine requirements.
  Removal of patches from the site package.
  Update site generator templates.
- Updated dependencies [513d45f]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.23
  - @jpmorganchase/mosaic-store@0.1.0-beta.23
  - @jpmorganchase/mosaic-types@0.1.0-beta.23

## 0.1.0-beta.22

### Patch Changes

- be89e4f: fix markdown tables and update generator's Salt patches

  - Salt patches in generator were out of sync with Mosaic repo
  - Markdown now support github flavoured markdown, such as Tables

- Updated dependencies [be89e4f]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.22
  - @jpmorganchase/mosaic-store@0.1.0-beta.22
  - @jpmorganchase/mosaic-types@0.1.0-beta.22

## 0.1.0-beta.21

### Patch Changes

- f75fd5e: fix sidebar which was generated after `beforeSend` had completed
- Updated dependencies [f75fd5e]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.21
  - @jpmorganchase/mosaic-store@0.1.0-beta.21
  - @jpmorganchase/mosaic-types@0.1.0-beta.21

## 0.1.0-beta.20

### Patch Changes

- 9c7b8ff: pip to beta.20
- Updated dependencies [9c7b8ff]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.20
  - @jpmorganchase/mosaic-store@0.1.0-beta.20
  - @jpmorganchase/mosaic-types@0.1.0-beta.20

## 0.1.0-beta.19

### Patch Changes

- ad06d4c: ensure spinner is removed after page has loaded
- Updated dependencies [ad06d4c]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.19
  - @jpmorganchase/mosaic-store@0.1.0-beta.19
  - @jpmorganchase/mosaic-types@0.1.0-beta.19

## 0.1.0-beta.18

### Patch Changes

- 066efed: Update docs with quick-start guide

  Sample docs now include a 'quick-start' guide to onboarding to AWS.

  Also

  - generator default directory is the current directory
  - after generating a site, it will run `yarn` in the created directory. This simplifies the generator call to just `yarn mosaic-create-site`

- Updated dependencies [066efed]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.18
  - @jpmorganchase/mosaic-store@0.1.0-beta.18
  - @jpmorganchase/mosaic-types@0.1.0-beta.18

## 0.1.0-beta.17

### Patch Changes

- b2f6d52: Fix `pre` block code block rendering
- Updated dependencies [b2f6d52]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.17
  - @jpmorganchase/mosaic-store@0.1.0-beta.17
  - @jpmorganchase/mosaic-types@0.1.0-beta.17

## 0.1.0-beta.16

### Patch Changes

- 3a5c88a: add missing `@types/node` dependency for generator
- Updated dependencies [3a5c88a]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.16
  - @jpmorganchase/mosaic-store@0.1.0-beta.16
  - @jpmorganchase/mosaic-types@0.1.0-beta.16

## 0.1.0-beta.15

### Patch Changes

- aaaf255: initial release of HTTP Source package.

  An HTTP source accepts a collection of endpoints and a path to a transformer module.
  The response from fetching is transformed and merged together into 1 single collection of pages.
  Should 1 of the endpoints request fail then it will have no impact on the other requests.

- Updated dependencies [aaaf255]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.15
  - @jpmorganchase/mosaic-store@0.1.0-beta.15
  - @jpmorganchase/mosaic-types@0.1.0-beta.15

## 0.1.0-beta.14

### Patch Changes

- dde3b5a: Feature release

  - Enhanced generators now have defaults.
    With one command (`yarn mosaic-create-site create`) it will generate a fully working site with both local and remote sources
  - Fix an issue where we could not clone from the master branch of git repos
  - Migrate to Next 13 image

- Updated dependencies [dde3b5a]
  - @jpmorganchase/mosaic-store@0.1.0-beta.14
  - @jpmorganchase/mosaic-types@0.1.0-beta.14

## 0.1.0-beta.13

### Patch Changes

- d4da1df: incremental improvements

  - move colormode into store
  - ensure breadcrumbs and sidebar data is only added to frontmatter for pages which use a layout that has breadcrumbs or a sidebar
  - improve changeset so it can work standalone without a monorepo
  - resolev json5 vulnerability

- Updated dependencies [d4da1df]
  - @jpmorganchase/mosaic-store@0.1.0-beta.13
  - @jpmorganchase/mosaic-types@0.1.0-beta.13

## 0.1.0-beta.12

### Patch Changes

- 9ec358b: Upgrade React to version 18 and NextJs to version 13
- 3eb35bf: initial work to enable generators to run outside of the repo
- Updated dependencies [9ec358b]
- Updated dependencies [3eb35bf]
  - @jpmorganchase/mosaic-store@0.1.0-beta.12
  - @jpmorganchase/mosaic-types@0.1.0-beta.12

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

- Updated dependencies [fc5d7b5]
  - @jpmorganchase/mosaic-store@0.1.0-beta.11
  - @jpmorganchase/mosaic-types@0.1.0-beta.11

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
  - @jpmorganchase/mosaic-store@0.1.0-beta.10
  - @jpmorganchase/mosaic-types@0.1.0-beta.10
