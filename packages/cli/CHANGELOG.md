# @jpmorganchase/mosaic-cli

## 1.0.0-beta.99

### Major Changes

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
- 79a39db: Validate the environment when the site and the CLI start
  
  Environment variables are still the only configuration, but each process
  now checks them in one place when it starts and lists every problem as
  `NAME: reason`, instead of failing later with a feature that silently
  does nothing.
  
  ### Breaking changes
  
  **`@jpmorganchase/mosaic-cli`**
  
  `mosaic serve` now exits with code 1, before any source loads, when its
  environment is invalid. Configurations it used to accept that now stop
  it:
  
  - `MOSAIC_REVALIDATE_URL` without `MOSAIC_REVALIDATE_SECRET`. Before,
    the revalidate notifier was quietly disabled. The secret on its own is
    still fine, since the site and the CLI can share an env file.
  - `MOSAIC_REVALIDATE_URL` or `BITBUCKET_API_URL` that isn't an absolute
    http(s) URL.
  - A `MOSAIC_CORS_ORIGINS` entry that isn't an origin
    (`scheme://host[:port]`), such as `example.com`, `*` or
    `https://example.com/`. Browsers never send those, so they never
    matched; the error suggests the origin to use.
  - A blank (whitespace-only) `MOSAIC_ADMIN_SECRET`,
    `MOSAIC_WORKFLOWS_SECRET`, `MOSAIC_BITBUCKET_WEBHOOK_SECRET` or
    `MOSAIC_REVALIDATE_SECRET`.
  - A `MOSAIC_SOURCE_BOOT_TIMEOUT_MS` that isn't a whole number of
    milliseconds (`0` still waits forever).
  - A `MOSAIC_WORKFLOWS_TIMEOUT_MS` that isn't a whole number of
    milliseconds between 1 and 2147483647. Larger values made every save
    time out at once.
  
  The placeholder `MOSAIC_WORKFLOWS_SECRET` from `.env.development` is not
  an error: outside `NODE_ENV=development` it still counts as unset.
  
  **Reference site (`packages/site`)**
  
  `src/instrumentation.ts` validates the env (through `src/lib/config.ts`)
  when a server starts: `next start`, the standalone `server.js` and
  `next dev`. With `NODE_ENV=production` an invalid configuration prints
  one error and exits with code 1 (left alone, Next.js would log the error
  and answer every request with a 500); `next dev` logs the same list and
  keeps running.
  `next build` and the static export don't check runtime variables, so
  images can still be built without them. Configurations that now stop a
  production server:
  
  - `MOSAIC_MODE` other than `active` or `snapshot-file`,
    and `MOSAIC_OUTPUT` other than `export` or `standalone`.
  - A missing `MOSAIC_ACTIVE_MODE_URL` in active mode (the default when
    `MOSAIC_MODE` is unset), or `MOSAIC_SNAPSHOT_DIR` in `snapshot-file`
    mode. Every page failed to load without them.
  - `MOSAIC_ACTIVE_MODE_URL` or `NEXT_PUBLIC_SITE_URL` that isn't an
    absolute http(s) URL (an invalid `NEXT_PUBLIC_SITE_URL` used to fall
    back to `http://localhost:3000` with a warning), and
    `MOSAIC_WORKFLOWS_URL` that isn't a ws(s) or http(s) URL.
  - `MOSAIC_WORKFLOWS_URL` without `MOSAIC_WORKFLOWS_SECRET`.
  - A flag other than `true` or `false` (`MOSAIC_AUTH_ENABLED`,
    `MOSAIC_ACTIVE_MODE_CACHE`, `MOSAIC_DISABLE_LOADER_CACHE`,
    `NEXT_PUBLIC_ENABLE_LOGIN`, `NEXT_PUBLIC_OPTIMIZE_IMAGES`,
    `MOSAIC_DEV_FAKE_AUTH`, `MOSAIC_DEV_BYPASS_CAPABILITY_GATE`). Only
    `true` ever turned one on, so `TRUE` or `1` silently meant off.
  - A `MOSAIC_EDITORS` entry that isn't an email address, an `@domain` or
    `*`, such as `*@corp.com`, which never matched anyone.
  
  Valid configurations behave as before. The placeholder `AUTH_SECRET` and
  `MOSAIC_REVALIDATE_SECRET` from `.env.development` are still ignored in
  production rather than rejected; that logic now lives in
  `lib/config.ts`. The site's `serve` script no longer sets the revalidate
  variables itself: `.env.development` now holds both. The full variable
  reference, with types and defaults, is in `packages/site/README.md` and
  `docs/configure/admin`.
- 5d69155: Run editor saves over HTTP and Server-Sent Events instead of a WebSocket
  
  Some infrastructure doesn't allow WebSockets but does allow Server-Sent
  Events (SSE). Saves now start with a plain HTTP request and stream their
  progress over SSE, which also reconnects by itself and resumes where it
  left off.
  
  ### Breaking changes
  
  **`@jpmorganchase/mosaic-cli`**
  
  - The `/workflows` WebSocket endpoint is removed, along with the
    `@fastify/websocket` and `md5` dependencies. Start a workflow with
    `POST /workflows/jobs` (JSON body: `name`, `user`, `route`, `markdown`,
    and optionally `frontmatter`, `targetRoute` and `isNewPage`), which
    responds `202 { jobId }`. Follow it with
    `GET /workflows/jobs/:jobId/events?user=<user id>`, a `text/event-stream`
    of `progress` events and a final `done` event with
    `{ status: 'SUCCESS' | 'ERROR', message }`. Reconnecting with
    `Last-Event-ID` replays only the missed events.
  - Both endpoints need `MOSAIC_WORKFLOWS_SECRET` as a bearer token
    (`Authorization: Bearer <secret>`) instead of a `token` in each message.
    They respond `503` when the secret isn't configured and `401` when it is
    wrong. Invalid requests get `400 { error }`, a missing page `404` and an
    existing new page `409`; the `channel` field is gone.
  - `MOSAIC_WORKFLOWS_TIMEOUT_MS` (default 5 minutes) is now read by the
    CLI, which fails jobs that run longer. Values must be integers from
    1 to 2147483647. The site no longer reads it.
  - Jobs are kept in memory (finished jobs for 10 minutes, at most 100 jobs
    and 500 events per job), so they are lost when the CLI restarts. With
    several CLI instances, a job's events must be read from the instance
    that started it.
  
  **Reference site (`packages/site`)**
  
  - `MOSAIC_WORKFLOWS_URL` is the CLI's base HTTP URL, e.g.
    `http://localhost:8080`. A trailing `/workflows` is dropped. A `ws://` /
    `wss://` URL still works: it is converted to `http://` / `https://` and
    a deprecation warning is logged once.
  - The `persistContent` Server Action is replaced by `startSave`, which
    returns `{ jobId }` or `{ error }`. The new
    `/api/workflows/[jobId]/events` route streams the save's progress to the
    signed-in editor who started it. Proxies must not buffer
    `text/event-stream` responses.
  
  **`@jpmorganchase/mosaic-types`**
  
  - `SourceWorkflowMessageEvent` no longer has a `channel` field.
  
  **`@jpmorganchase/mosaic-workflows`**
  
  - GitHub and Bitbucket workflows send `COMPLETE` with
    `{ pullRequestUrl }` instead of provider-specific response data. Custom
    event consumers should read this browser-facing URL. The action return
    values are unchanged, and `subscribeToSave` still accepts older GitHub
    URL strings and Bitbucket `links.self` messages.
  
  ### Fixes
  
  - Saving an existing page no longer reports "Workflow save has started"
    when no source owns the page: the CLI now waits for the workflow and
    reports its real outcome. `triggerWorkflow` in
    `@jpmorganchase/mosaic-core` resolves when the workflow finishes rather
    than when it starts.
  - Actions returning `false` or reporting `ERROR` remain failed through
    the source and job layers instead of being reported as successful.
  - GitHub and Bitbucket saves accept a new page with frontmatter and an
    empty body, as the editor does. Empty edits are still rejected.
  - The editor shows a successful result and disables repeat submission
    even when the successful workflow returns no pull request URL.
  
  ### Additions
  
  - `@jpmorganchase/mosaic-content-editor-plugin`: `subscribeToSave(jobId)`
    follows a save over SSE as the `PersistEvent`s that `<Editor persist>`
    returns, letting `EventSource` reconnect a few times before reporting an
    error. The `PersistEvent` type is exported too. The `persist` prop is
    unchanged.

### Minor Changes

- b581d8b: Refresh git repo sources as soon as Bitbucket reports a push
  
  ### Additions
  
  **`@jpmorganchase/mosaic-cli`**
  
  - `POST /_mosaic_/webhooks/bitbucket` receives Bitbucket Data Center
    "Repository → Push" webhooks. It refreshes the running git repo sources
    whose `repo` (project key and slug, in any of the `/scm/`, SSH or
    `/projects/…/repos/…` URL forms) and `branch` match the push, so merged
    changes appear within seconds instead of at the next scheduled check
    (30 minutes by default). Pushes within 5 seconds of each other refresh a
    source once. The CLI replies `202` straight away and refreshes in the
    background; the site is then revalidated as for any other update.
  - The endpoint only exists when `MOSAIC_BITBUCKET_WEBHOOK_SECRET` is set. It
    doesn't use `MOSAIC_ADMIN_SECRET`: requests must carry a valid
    `X-Hub-Signature` (HMAC-SHA256 of the body with the secret) or get `401`.
    Bodies are capped at 1 MB.
  
  **`@jpmorganchase/mosaic-core`**
  
  - `refreshSource(name)` asks a running source to check for changes now.
    Unlike `restartSource`, the source keeps serving its pages and its caches.
    It resolves to `false` for sources that can't refresh on demand.
  - `getSourceDefinition(name)` returns the definition a running source was
    started with.
  
  **`@jpmorganchase/mosaic-types`**
  
  - Sources can implement an optional `refresh(options)` hook, which
    `refreshSource` calls in the source's worker.
  
  **`@jpmorganchase/mosaic-source-git-repo`**
  
  - Implements `refresh`: it fetches and pulls new commits the same way a
    scheduled check does.
  - `Repo.checkForChanges()` runs that check on demand. Checks no longer
    overlap: one requested while another runs (a webhook during a scheduled
    fetch) runs once more afterwards.
  
  Scheduled checks are unchanged and remain the fallback for missed
  deliveries. See "Refresh on push" in the git repo source docs.

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
- 2ecdf25: Subscribe to source updates before starting snapshot builds so a fast source cannot publish its first update before the CLI listens. Wait for every enabled source's first update and completed startup before writing or scoping the snapshot, then stop the sources. Repeated updates from one source cannot stand in for another source.
- 3b956ae: Keep repository credentials out of command failures and Bitbucket save errors. Capture one Git revision per timestamp batch and consume the bulk map directly, avoiding a subprocess for every cached page.
  
  Retry failed site invalidations with a request deadline and bounded backoff, preserve updates arriving during delivery, and cancel notification work when the server closes. Add `mosaic serve --host` with the existing loopback default so container deployments can explicitly bind to `0.0.0.0`.
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
- 79a39db: Keep the reference site's development revalidation URL alongside its shared secret, so source updates still invalidate the site cache after moving settings into environment files. Validate the committed defaults in regression tests and align site validation with the supported active and snapshot-file modes.
- 2a2f07e: Update dependencies with security fixes: `fastify` 5.12.8, `@fastify/middie` 9.3.6, `undici` 8.12.4, `swagger-ui-react` 5.34.1 and `@apidevtools/json-schema-ref-parser` 16.
- Updated dependencies [b581d8b]
- Updated dependencies [0c4d822]
- Updated dependencies [2ecdf25]
- Updated dependencies [3b956ae]
- Updated dependencies [915b9ae]
- Updated dependencies [168391e]
- Updated dependencies [915b9ae]
- Updated dependencies [2a2f07e]
- Updated dependencies [0c4d822]
- Updated dependencies [168391e]
- Updated dependencies [5d69155]
  - @jpmorganchase/mosaic-core@1.0.0-beta.99
  - @jpmorganchase/mosaic-source-git-repo@1.0.0-beta.99
  - @jpmorganchase/mosaic-source-local-folder@1.0.0-beta.99
  - @jpmorganchase/mosaic-plugins@1.0.0-beta.99

## 0.1.0-beta.98

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.98
- @jpmorganchase/mosaic-plugins@0.1.0-beta.98
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.98

## 0.1.0-beta.97

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.97
- @jpmorganchase/mosaic-plugins@0.1.0-beta.97
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.97

## 0.1.0-beta.96

### Patch Changes

- Updated dependencies [5e42846]
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.96
  - @jpmorganchase/mosaic-core@0.1.0-beta.96
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.96

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
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.95
  - @jpmorganchase/mosaic-core@0.1.0-beta.95
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.95

## 0.1.0-beta.94

### Patch Changes

- Updated dependencies [8c04c22a]
  - @jpmorganchase/mosaic-core@0.1.0-beta.94
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.94
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.94
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.94

## 0.1.0-beta.93

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.93
- @jpmorganchase/mosaic-plugins@0.1.0-beta.93
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.93
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.93

## 0.1.0-beta.92

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.92
- @jpmorganchase/mosaic-plugins@0.1.0-beta.92
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.92
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.92

## 0.1.0-beta.91

### Patch Changes

- 43650506: add actuator keepalive response for server health monitor
  - @jpmorganchase/mosaic-core@0.1.0-beta.91
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.91
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.91
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.91

## 0.1.0-beta.90

### Patch Changes

- Updated dependencies [adfb33a7]
- Updated dependencies [61180b78]
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.90
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.90
  - @jpmorganchase/mosaic-core@0.1.0-beta.90
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.90

## 0.1.0-beta.89

### Patch Changes

- Updated dependencies [3dcd0dc0]
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.89
  - @jpmorganchase/mosaic-core@0.1.0-beta.89
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.89
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.89

## 0.1.0-beta.88

### Patch Changes

- Updated dependencies [738940d9]
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.88
  - @jpmorganchase/mosaic-core@0.1.0-beta.88
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.88
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.88

## 0.1.0-beta.87

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.87
- @jpmorganchase/mosaic-plugins@0.1.0-beta.87
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.87
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.87

## 0.1.0-beta.86

### Patch Changes

- b8361977: Feat: add GithubPullRequestWorkflow

  This workflow requires a [fine-grained github personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) so that the github rest API can be used to create Pull Requests.

- Updated dependencies [89245d87]
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.86
  - @jpmorganchase/mosaic-core@0.1.0-beta.86
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.86
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.86

## 0.1.0-beta.85

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.85
- @jpmorganchase/mosaic-plugins@0.1.0-beta.85
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.85
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.85

## 0.1.0-beta.84

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.84
- @jpmorganchase/mosaic-plugins@0.1.0-beta.84
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.84
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.84

## 0.1.0-beta.83

### Patch Changes

- Updated dependencies [24551c8d]
- Updated dependencies [182a4307]
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.83
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.83
  - @jpmorganchase/mosaic-core@0.1.0-beta.83
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.83

## 0.1.0-beta.82

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.82
- @jpmorganchase/mosaic-plugins@0.1.0-beta.82
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.82
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.82

## 0.1.0-beta.81

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.81
- @jpmorganchase/mosaic-plugins@0.1.0-beta.81
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.81
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.81

## 0.1.0-beta.80

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.80
- @jpmorganchase/mosaic-plugins@0.1.0-beta.80
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.80
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.80

## 0.1.0-beta.79

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.79
- @jpmorganchase/mosaic-plugins@0.1.0-beta.79
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.79
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.79

## 0.1.0-beta.78

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.78
- @jpmorganchase/mosaic-plugins@0.1.0-beta.78
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.78
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.78

## 0.1.0-beta.77

### Patch Changes

- Updated dependencies [3cc2ea94]
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.77
  - @jpmorganchase/mosaic-core@0.1.0-beta.77
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.77
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.77

## 0.1.0-beta.76

### Patch Changes

- Updated dependencies [727fcd54]
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.76
  - @jpmorganchase/mosaic-core@0.1.0-beta.76
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.76
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.76

## 0.1.0-beta.75

### Patch Changes

- Updated dependencies [fd6d715d]
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.75
  - @jpmorganchase/mosaic-core@0.1.0-beta.75
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.75
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.75

## 0.1.0-beta.74

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.74
- @jpmorganchase/mosaic-plugins@0.1.0-beta.74
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.74
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.74

## 0.1.0-beta.73

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.73
- @jpmorganchase/mosaic-plugins@0.1.0-beta.73
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.73
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.73

## 0.1.0-beta.72

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.72
- @jpmorganchase/mosaic-plugins@0.1.0-beta.72
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.72
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.72

## 0.1.0-beta.71

### Patch Changes

- Updated dependencies [c21f28e7]
- Updated dependencies [30a19145]
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.71
  - @jpmorganchase/mosaic-core@0.1.0-beta.71
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.71
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.71

## 0.1.0-beta.70

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.70
- @jpmorganchase/mosaic-plugins@0.1.0-beta.70
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.70
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.70

## 0.1.0-beta.69

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.69
- @jpmorganchase/mosaic-plugins@0.1.0-beta.69
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.69
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.69

## 0.1.0-beta.68

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.68
- @jpmorganchase/mosaic-plugins@0.1.0-beta.68
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.68
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.68

## 0.1.0-beta.67

### Patch Changes

- Updated dependencies [6abf1910]
- Updated dependencies [30e2f038]
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.67
  - @jpmorganchase/mosaic-core@0.1.0-beta.67
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.67
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.67

## 0.1.0-beta.66

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.66
- @jpmorganchase/mosaic-plugins@0.1.0-beta.66
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.66
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.66

## 0.1.0-beta.65

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.65
- @jpmorganchase/mosaic-plugins@0.1.0-beta.65
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.65
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.65

## 0.1.0-beta.64

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.64
- @jpmorganchase/mosaic-plugins@0.1.0-beta.64
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.64
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.64

## 0.1.0-beta.63

### Patch Changes

- Updated dependencies [680eb0eb]
  - @jpmorganchase/mosaic-core@0.1.0-beta.63
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.63
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.63
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.63

## 0.1.0-beta.62

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.62
- @jpmorganchase/mosaic-plugins@0.1.0-beta.62
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.62
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.62

## 0.1.0-beta.61

### Patch Changes

- cec89401: add `pluginTimeout` (20 secs) to fastify to prevent loading timeout
- Updated dependencies [cec89401]
  - @jpmorganchase/mosaic-core@0.1.0-beta.61
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.61
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.61
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.61

## 0.1.0-beta.60

### Patch Changes

- a3da0830: New Readme Source

  This source pulls a single Readme.md from a remote Source repo.
  Typically used for third-party repos which exist already or don't want to
  create a full document hierachy and use `@jpmorganchase/mosaic-source-git-repo`.
  By pulling a single page, we can add metadata to that page via the source's config.
  It's also more performant as we do not need to pull a whole source repo.

- Updated dependencies [a3da0830]
  - @jpmorganchase/mosaic-core@0.1.0-beta.60
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.60
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.60
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.60

## 0.1.0-beta.59

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.59
- @jpmorganchase/mosaic-plugins@0.1.0-beta.59
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.59
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.59

## 0.1.0-beta.58

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.58
- @jpmorganchase/mosaic-plugins@0.1.0-beta.58
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.58
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.58

## 0.1.0-beta.57

### Patch Changes

- d214d112: Add catch-all default exports for

  - `@jpmorganchase/mosaic-store`
  - `@jpmorganchase/mosaic-theme`
  - `@jpmorganchase/mosaic-workflows`

  This resolves an issue when running tests from an external repo which depends on these packages

- Updated dependencies [d214d112]
  - @jpmorganchase/mosaic-core@0.1.0-beta.57
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.57
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.57
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.57

## 0.1.0-beta.56

### Patch Changes

- 6d30e29f: Add new Storybook source

  Storybook stories can be extracted from Storybook and embedded into Mosaic pages.

  The stories are extracted based on a configured filter or matching tags.

  With a page created for each Story, the author can create a dynamic index of matching stories.

  eg. An index of patterns which match a specific tag

- Updated dependencies [7c94fb06]
- Updated dependencies [6d30e29f]
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.56
  - @jpmorganchase/mosaic-core@0.1.0-beta.56
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.56
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.56

## 0.1.0-beta.55

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.55
- @jpmorganchase/mosaic-plugins@0.1.0-beta.55
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.55
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.55

## 0.1.0-beta.54

### Patch Changes

- Updated dependencies [5c83b602]
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.54
  - @jpmorganchase/mosaic-core@0.1.0-beta.54
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.54
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.54

## 0.1.0-beta.53

### Patch Changes

- Updated dependencies [d7098baa]
  - @jpmorganchase/mosaic-core@0.1.0-beta.53
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.53
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.53
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.53

## 0.1.0-beta.52

### Patch Changes

- 9ad7418c: Use a websocket for workflows
- Updated dependencies [9ad7418c]
  - @jpmorganchase/mosaic-core@0.1.0-beta.52
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.52
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.52
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.52

## 0.1.0-beta.51

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.51
- @jpmorganchase/mosaic-plugins@0.1.0-beta.51
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.51
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.51

## 0.1.0-beta.50

### Patch Changes

- 2f015976: ### Feat

  `enableSourcePush` is now a property of the Mosaic Config file. This functionality was previously configured using an environment variable `process.env.MOSAIC_ENABLE_SOURCE_PUSH`

  ### Fix

  The Admin API that returned the Mosaic config file now strips credentials from git reo sources

  ### Refactor

  Fastify is now used as the web server powering the `serve` functionality of the Mosaic CLI.

- Updated dependencies [2f015976]
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.50
  - @jpmorganchase/mosaic-core@0.1.0-beta.50
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.50
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.50

## 0.1.0-beta.49

### Patch Changes

- Updated dependencies [425b5a00]
  - @jpmorganchase/mosaic-core@0.1.0-beta.49
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.49
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.49
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.49

## 0.1.0-beta.48

### Patch Changes

- Updated dependencies [0eca1d6e]
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.48
  - @jpmorganchase/mosaic-core@0.1.0-beta.48
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.48
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.48

## 0.1.0-beta.47

### Patch Changes

- 8c5cead5: ### Feat

  Add admin API to retrieve the entire mosaic filesystem as JSON

  ### Fix

  Ensure that the pages from a restarted source are added to the global filesystem

- Updated dependencies [6caa661a]
- Updated dependencies [8c5cead5]
  - @jpmorganchase/mosaic-core@0.1.0-beta.47
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.47
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.47
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.47

## 0.1.0-beta.46

### Patch Changes

- Updated dependencies [9a2aacb5]
  - @jpmorganchase/mosaic-core@0.1.0-beta.46
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.46
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.46
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.46

## 0.1.0-beta.45

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.45
- @jpmorganchase/mosaic-plugins@0.1.0-beta.45
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.45
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.45

## 0.1.0-beta.44

### Patch Changes

- e768f4b: ### Fixes

  Strip credentials when using the list sources admin API

- Updated dependencies [e768f4b]
  - @jpmorganchase/mosaic-core@0.1.0-beta.44
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.44
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.44
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.44

## 0.1.0-beta.43

### Patch Changes

- 682c784: Add Admin endpoints
- 0ced179: ## Feature

  Any exception raised by plugins during any part of the plugin lifecycle are converted to instances of PluginError and tracked by the source that is running the plugins. This means plugin errors do not cause the source to close and content will continue to be served by Mosaic.

  Plugin authors should be encouraged to throw a `PluginError` as should an error occur when processing a particular page, then the full path to the page can be included in the error descriptor.

  Plugin errors are not currently surfaced to a Mosaic site but can be viewed using the list sources admin API.

  ## Fix

  The `saveContent` plugin lifecycle method is removed. This concept was replaced with workflows some time ago and should have been removed then.

- Updated dependencies [d3b8b3a]
- Updated dependencies [7013042]
- Updated dependencies [682c784]
- Updated dependencies [c0ee0f3]
- Updated dependencies [0ced179]
  - @jpmorganchase/mosaic-core@0.1.0-beta.43
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.43
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.43
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.43

## 0.1.0-beta.42

### Patch Changes

- Updated dependencies [3491f29]
- Updated dependencies [a62b028]
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.42
  - @jpmorganchase/mosaic-core@0.1.0-beta.42
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.42
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.42

## 0.1.0-beta.41

### Patch Changes

- Updated dependencies [898c9ad]
- Updated dependencies [5cd5a87]
  - @jpmorganchase/mosaic-core@0.1.0-beta.41
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.41
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.41
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.41

## 0.1.0-beta.40

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.40
- @jpmorganchase/mosaic-plugins@0.1.0-beta.40
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.40
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.40

## 0.1.0-beta.39

### Patch Changes

- Updated dependencies [d2ff626]
- Updated dependencies [2b3948d]
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.39
  - @jpmorganchase/mosaic-core@0.1.0-beta.39
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.39
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.39

## 0.1.0-beta.38

### Patch Changes

- Updated dependencies [dc993df]
  - @jpmorganchase/mosaic-core@0.1.0-beta.38
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.38
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.38
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.38

## 0.1.0-beta.37

### Patch Changes

- Updated dependencies [feb5b9e]
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.37
  - @jpmorganchase/mosaic-core@0.1.0-beta.37
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.37
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.37

## 0.1.0-beta.36

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.36
- @jpmorganchase/mosaic-plugins@0.1.0-beta.36
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.36
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.36

## 0.1.0-beta.35

### Patch Changes

- Updated dependencies [00a9408]
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.35
  - @jpmorganchase/mosaic-core@0.1.0-beta.35
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.35
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.35

## 0.1.0-beta.34

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.34
- @jpmorganchase/mosaic-plugins@0.1.0-beta.34
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.34
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.34

## 0.1.0-beta.33

### Patch Changes

- Updated dependencies [cb18c31]
- Updated dependencies [e6d9594]
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.33
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.33
  - @jpmorganchase/mosaic-core@0.1.0-beta.33
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.33

## 0.1.0-beta.32

### Patch Changes

- a56eadb: ## Source Pushing

  The Mosaic CLI provides an endpoint `/sources/add/` that allows a new source to be pushed to a running instance of Mosaic.

  To do this you make a POST request with a JSON body composed of

  - a `name` property
  - a `definition` property

  ### Example request body

  Pushing a new git repo source:

  ```
  {
      "name":"my-docs-preview",
      "definition": {
        "modulePath": "@jpmorganchase/mosaic-source-git-repo",
        "namespace": "my-docs",
        "options": {
          "credentials":<access-token>,
          "prefixDir": "my-docs",
          "cache": true,
          "subfolder": "docs",
          "repo": <repo-url>,
          "branch": "main",
          "extensions": [".mdx"],
          "remote": "origin"
        }
      }
  }
  ```

  ## Notes

  By default, these sources are marked as a "preview" which means `preview-` is appended to the source namespace and certain plugins will not be run on this source e.g. search and sitemap plugins.

  You can disabled this behavior in 2 ways:

  1. send the property `isPreview` with the value of false as part of the POST request body
  2. modify plugin definitions in the mosaic config file to set `previewDisabled` to be false for all plugins you wish have run on this source.

- Updated dependencies [a56eadb]
- Updated dependencies [7ed1ee7]
- Updated dependencies [8c854fd]
  - @jpmorganchase/mosaic-core@0.1.0-beta.32
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.32
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.32
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.32

## 0.1.0-beta.31

### Patch Changes

- b609fd0: Added support for containerization of the site and cli as well as providing config for kubernetes development (skaffold)

  ## @jpmorganchase/mosaic-cli

  The cli package has been updated to support containerization.

- Updated dependencies [b609fd0]
- Updated dependencies [0f702ad]
  - @jpmorganchase/mosaic-core@0.1.0-beta.31
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.31
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.31
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.31

## 0.1.0-beta.30

### Patch Changes

- 18ef436: The git repo source no longer generates a double slash between the repo host and repo path.
- Updated dependencies [18ef436]
  - @jpmorganchase/mosaic-core@0.1.0-beta.30

## 0.1.0-beta.29

### Minor Changes

- c78deb4: Flatten Sidebar
  Search Optimisation
  Public Assets Plugin
  TOC Indentation

### Patch Changes

- Updated dependencies [c78deb4]
  - @jpmorganchase/mosaic-core@0.1.0-beta.29

## 0.1.0-beta.28

### Patch Changes

- 27ac914: 1. Layout improvements. 2. Fix: if a user hits a url that lands on a directory, the index file within that directory is resolved as the content. 3. Fix: improve Table of Contents component highlighting.
- Updated dependencies [27ac914]
  - @jpmorganchase/mosaic-core@0.1.0-beta.28

## 0.1.0-beta.27

### Patch Changes

- b465413: Improvements to vercel deployments
- Updated dependencies [b465413]
  - @jpmorganchase/mosaic-core@0.1.0-beta.27

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
  - @jpmorganchase/mosaic-core@0.1.0-beta.26

## 0.1.0-beta.25

### Minor Changes

- 93e9b07: The theme contract provided by the `@jpmorganchase/mosaic-theme` package now uses locally scoped variable names via a Vanilla Extract [Theme Contract](https://vanilla-extract.style/documentation/api/create-theme-contract/). Previously the theme variables were globally scoped resulting in conflicts with other design systems.

### Patch Changes

- a36219c: - Next/Prev page buttons were not appearing at the bottom of a page sequence
  - Removed redundant snapshot page api
- Updated dependencies [a36219c]
- Updated dependencies [93e9b07]
  - @jpmorganchase/mosaic-core@0.1.0-beta.25

## 0.1.0-beta.24

### Patch Changes

- 049d9af: 1. Pip Salt version 2. Issues 155, make 500 error more specific 3. button and sidebar styles 4. search opt-out
- Updated dependencies [049d9af]
  - @jpmorganchase/mosaic-core@0.1.0-beta.24

## 0.1.0-beta.23

### Patch Changes

- 513d45f: Sidebar behavior and styling changes.
  Add Client-side search feature.
  Relax node engine requirements.
  Removal of patches from the site package.
  Update site generator templates.
- Updated dependencies [513d45f]
  - @jpmorganchase/mosaic-core@0.1.0-beta.23

## 0.1.0-beta.22

### Patch Changes

- be89e4f: fix markdown tables and update generator's Salt patches

  - Salt patches in generator were out of sync with Mosaic repo
  - Markdown now support github flavoured markdown, such as Tables

- Updated dependencies [be89e4f]
  - @jpmorganchase/mosaic-core@0.1.0-beta.22

## 0.1.0-beta.21

### Patch Changes

- f75fd5e: fix sidebar which was generated after `beforeSend` had completed
- Updated dependencies [f75fd5e]
  - @jpmorganchase/mosaic-core@0.1.0-beta.21

## 0.1.0-beta.20

### Patch Changes

- 9c7b8ff: pip to beta.20
- Updated dependencies [9c7b8ff]
  - @jpmorganchase/mosaic-core@0.1.0-beta.20

## 0.1.0-beta.19

### Patch Changes

- ad06d4c: ensure spinner is removed after page has loaded
- Updated dependencies [ad06d4c]
  - @jpmorganchase/mosaic-core@0.1.0-beta.19

## 0.1.0-beta.18

### Patch Changes

- 066efed: Update docs with quick-start guide

  Sample docs now include a 'quick-start' guide to onboarding to AWS.

  Also

  - generator default directory is the current directory
  - after generating a site, it will run `yarn` in the created directory. This simplifies the generator call to just `yarn mosaic-create-site`

- Updated dependencies [066efed]
  - @jpmorganchase/mosaic-core@0.1.0-beta.18

## 0.1.0-beta.17

### Patch Changes

- b2f6d52: Fix `pre` block code block rendering
- Updated dependencies [b2f6d52]
  - @jpmorganchase/mosaic-core@0.1.0-beta.17

## 0.1.0-beta.16

### Patch Changes

- 3a5c88a: add missing `@types/node` dependency for generator
- Updated dependencies [3a5c88a]
  - @jpmorganchase/mosaic-core@0.1.0-beta.16

## 0.1.0-beta.15

### Patch Changes

- aaaf255: initial release of HTTP Source package.

  An HTTP source accepts a collection of endpoints and a path to a transformer module.
  The response from fetching is transformed and merged together into 1 single collection of pages.
  Should 1 of the endpoints request fail then it will have no impact on the other requests.

- Updated dependencies [aaaf255]
  - @jpmorganchase/mosaic-core@0.1.0-beta.15

## 0.1.0-beta.14

### Patch Changes

- dde3b5a: Feature release

  - Enhanced generators now have defaults.
    With one command (`yarn mosaic-create-site create`) it will generate a fully working site with both local and remote sources
  - Fix an issue where we could not clone from the master branch of git repos
  - Migrate to Next 13 image

- Updated dependencies [dde3b5a]
  - @jpmorganchase/mosaic-core@0.1.0-beta.14

## 0.1.0-beta.13

### Patch Changes

- d4da1df: incremental improvements

  - move colormode into store
  - ensure breadcrumbs and sidebar data is only added to frontmatter for pages which use a layout that has breadcrumbs or a sidebar
  - improve changeset so it can work standalone without a monorepo
  - resolev json5 vulnerability

- Updated dependencies [d4da1df]
  - @jpmorganchase/mosaic-core@0.1.0-beta.13

## 0.1.0-beta.12

### Patch Changes

- 9ec358b: Upgrade React to version 18 and NextJs to version 13
- Updated dependencies [9ec358b]
  - @jpmorganchase/mosaic-core@0.1.0-beta.12

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
  - @jpmorganchase/mosaic-core@0.1.0-beta.11

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
  - @jpmorganchase/mosaic-core@0.1.0-beta.10

## 0.1.0-beta.9

### Minor Changes

- c3fee89: initial components package

  - added JSDOM testing

## 0.1.0-beta.8

### Minor Changes

- 2dca0b1: initial release of Mosaic store package

## 0.1.0-beta.7

### Minor Changes

- f82c397: Initial release of theme and client side search

  We are iterating towards deploying our site code.

  This release includes

  - initial work for client-side search support
  - Mosaic theme.

## 0.1.0-beta.6

### Patch Changes

- c103b24: Release fixes for snapshot serve

## 0.1.0-beta.5

### Patch Changes

- 61a246c: This releases add support for generate / build and serve snapshots

## 0.1.0-beta.4

### Patch Changes

- bd285df: added dist to package.json

## 0.1.0-beta.3

### Patch Changes

- 457df5e: switch to public package

## 0.1.0-beta.2

### Patch Changes

- e1bbbe7: Initial release of Mosaic Core file-system.

  Mosaic is a content aggregating service which pulls content from heterogeneous data sources.

- 4b2bc51: pipped to 0.1.0-beta.1 for publishing to NPM

## 0.1.0

### Patch Changes

- e1bbbe7: Initial release of Mosaic Core file-system.

  Mosaic is a content aggregating service which pulls content from heterogeneous data sources.
