# @jpmorganchase/mosaic-types

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
- 168391e: Replace `fast-glob` with `tinyglobby`, which drops `micromatch` and `braces` (SNYK-JS-BRACES-19963945) from Mosaic's runtime dependencies. Globs match the same files as before. The `glob` methods on `IFileAccess` and `IVolume` now take `tinyglobby` options and return `string[]`; fast-glob-only options such as `stats` and `objectMode` are no longer accepted.

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

## 0.1.0-beta.98

## 0.1.0-beta.97

## 0.1.0-beta.96

### Patch Changes

- ce408d6: Improve error handling

  Improve error handling of `fromHTTPRequest` and `createHttpSource`.
  An object is now returned providing the successful responses and also an error for each failed request.
  This enables you to process the error in your Source but also fixes an issue where, one bad request would
  drop all the other successful responses.

- 5e42846: Improved logging by standardizing the prefix

## 0.1.0-beta.95

## 0.1.0-beta.94

## 0.1.0-beta.93

## 0.1.0-beta.92

## 0.1.0-beta.91

## 0.1.0-beta.90

## 0.1.0-beta.89

## 0.1.0-beta.88

## 0.1.0-beta.87

## 0.1.0-beta.86

### Patch Changes

- b8361977: Feat: add GithubPullRequestWorkflow

  This workflow requires a [fine-grained github personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) so that the github rest API can be used to create Pull Requests.

## 0.1.0-beta.85

## 0.1.0-beta.84

## 0.1.0-beta.83

## 0.1.0-beta.82

## 0.1.0-beta.81

## 0.1.0-beta.80

## 0.1.0-beta.79

## 0.1.0-beta.78

## 0.1.0-beta.77

## 0.1.0-beta.76

## 0.1.0-beta.75

## 0.1.0-beta.74

## 0.1.0-beta.73

## 0.1.0-beta.72

## 0.1.0-beta.71

## 0.1.0-beta.70

## 0.1.0-beta.69

## 0.1.0-beta.68

## 0.1.0-beta.67

## 0.1.0-beta.66

## 0.1.0-beta.65

## 0.1.0-beta.64

## 0.1.0-beta.63

## 0.1.0-beta.62

## 0.1.0-beta.61

### Patch Changes

- cec89401: add `pluginTimeout` (20 secs) to fastify to prevent loading timeout

## 0.1.0-beta.60

### Patch Changes

- a3da0830: New Readme Source

  This source pulls a single Readme.md from a remote Source repo.
  Typically used for third-party repos which exist already or don't want to
  create a full document hierachy and use `@jpmorganchase/mosaic-source-git-repo`.
  By pulling a single page, we can add metadata to that page via the source's config.
  It's also more performant as we do not need to pull a whole source repo.

## 0.1.0-beta.59

## 0.1.0-beta.58

## 0.1.0-beta.57

### Patch Changes

- d214d112: Add catch-all default exports for

  - `@jpmorganchase/mosaic-store`
  - `@jpmorganchase/mosaic-theme`
  - `@jpmorganchase/mosaic-workflows`

  This resolves an issue when running tests from an external repo which depends on these packages

## 0.1.0-beta.56

### Patch Changes

- 6d30e29f: Add new Storybook source

  Storybook stories can be extracted from Storybook and embedded into Mosaic pages.

  The stories are extracted based on a configured filter or matching tags.

  With a page created for each Story, the author can create a dynamic index of matching stories.

  eg. An index of patterns which match a specific tag

## 0.1.0-beta.55

## 0.1.0-beta.54

## 0.1.0-beta.53

### Patch Changes

- d7098baa: ### Feature

  Add new `afterNamespaceSourceUpdate` plugin lifecycle method.

  This method is identical to `afterUpdate` but will **only** run if the `shouldUpdateNamespaceSources` lifecycle method returns `true`.

## 0.1.0-beta.52

### Patch Changes

- 9ad7418c: Use a websocket for workflows

## 0.1.0-beta.51

## 0.1.0-beta.50

## 0.1.0-beta.49

### Patch Changes

- 425b5a00: ### Feature

  Add new plugin lifecycle method `shouldUpdateNamespaceSources`.

  This method is called when a source emits new pages and there is another source(s) that share the same namespace.

  If `shouldUpdateNamespaceSources` returns `true` then the other source(s), i.e., not the source that triggered the initial update, will call `afterUpdate` again.

## 0.1.0-beta.48

### Patch Changes

- 0eca1d6e: ### Fixes

  - Fix types of `IUnionVolume` so that the `promises` property is correct

  - Fix Breadcrumb generation so that the global filesystem is used to identify the full breadcrumbs path.

## 0.1.0-beta.47

## 0.1.0-beta.46

## 0.1.0-beta.45

## 0.1.0-beta.44

## 0.1.0-beta.43

### Patch Changes

- d3b8b3a: `SharedConfigPlugin` can now apply a shared config to a source that doesn't have one but shares a namespace with 1 that does.
- 0ced179: ## Feature

  Any exception raised by plugins during any part of the plugin lifecycle are converted to instances of PluginError and tracked by the source that is running the plugins. This means plugin errors do not cause the source to close and content will continue to be served by Mosaic.

  Plugin authors should be encouraged to throw a `PluginError` as should an error occur when processing a particular page, then the full path to the page can be included in the error descriptor.

  Plugin errors are not currently surfaced to a Mosaic site but can be viewed using the list sources admin API.

  ## Fix

  The `saveContent` plugin lifecycle method is removed. This concept was replaced with workflows some time ago and should have been removed then.

## 0.1.0-beta.42

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

## 0.1.0-beta.40

## 0.1.0-beta.39

## 0.1.0-beta.38

## 0.1.0-beta.37

## 0.1.0-beta.36

## 0.1.0-beta.35

## 0.1.0-beta.34

## 0.1.0-beta.33

## 0.1.0-beta.32

### Patch Changes

- 8c854fd: - Upgrade `next-auth` version
  - Update `withSession` mosaic middleware to use `next-auth`

## 0.1.0-beta.31

### Patch Changes

- b609fd0: Added support for containerization of the site and cli as well as providing config for kubernetes development (skaffold)

  ## @jpmorganchase/mosaic-cli

  The cli package has been updated to support containerization.

## 0.1.0-beta.30

### Patch Changes

- 18ef436: The git repo source no longer generates a double slash between the repo host and repo path.

## 0.1.0-beta.29

### Minor Changes

- c78deb4: Flatten Sidebar
  Search Optimisation
  Public Assets Plugin
  TOC Indentation

## 0.1.0-beta.28

### Patch Changes

- 27ac914: 1. Layout improvements. 2. Fix: if a user hits a url that lands on a directory, the index file within that directory is resolved as the content. 3. Fix: improve Table of Contents component highlighting.

## 0.1.0-beta.27

### Patch Changes

- b465413: Improvements to vercel deployments

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

## 0.1.0-beta.25

### Minor Changes

- 93e9b07: The theme contract provided by the `@jpmorganchase/mosaic-theme` package now uses locally scoped variable names via a Vanilla Extract [Theme Contract](https://vanilla-extract.style/documentation/api/create-theme-contract/). Previously the theme variables were globally scoped resulting in conflicts with other design systems.

### Patch Changes

- a36219c: - Next/Prev page buttons were not appearing at the bottom of a page sequence
  - Removed redundant snapshot page api

## 0.1.0-beta.24

### Patch Changes

- 049d9af: 1. Pip Salt version 2. Issues 155, make 500 error more specific 3. button and sidebar styles 4. search opt-out

## 0.1.0-beta.23

### Patch Changes

- 513d45f: Sidebar behavior and styling changes.
  Add Client-side search feature.
  Relax node engine requirements.
  Removal of patches from the site package.
  Update site generator templates.

## 0.1.0-beta.22

### Patch Changes

- be89e4f: fix markdown tables and update generator's Salt patches

  - Salt patches in generator were out of sync with Mosaic repo
  - Markdown now support github flavoured markdown, such as Tables

## 0.1.0-beta.21

### Patch Changes

- f75fd5e: fix sidebar which was generated after `beforeSend` had completed

## 0.1.0-beta.20

### Patch Changes

- 9c7b8ff: pip to beta.20

## 0.1.0-beta.19

### Patch Changes

- ad06d4c: ensure spinner is removed after page has loaded

## 0.1.0-beta.18

### Patch Changes

- 066efed: Update docs with quick-start guide

  Sample docs now include a 'quick-start' guide to onboarding to AWS.

  Also

  - generator default directory is the current directory
  - after generating a site, it will run `yarn` in the created directory. This simplifies the generator call to just `yarn mosaic-create-site`

## 0.1.0-beta.17

### Patch Changes

- b2f6d52: Fix `pre` block code block rendering

## 0.1.0-beta.16

### Patch Changes

- 3a5c88a: add missing `@types/node` dependency for generator

## 0.1.0-beta.15

### Patch Changes

- aaaf255: initial release of HTTP Source package.

  An HTTP source accepts a collection of endpoints and a path to a transformer module.
  The response from fetching is transformed and merged together into 1 single collection of pages.
  Should 1 of the endpoints request fail then it will have no impact on the other requests.

## 0.1.0-beta.14

### Patch Changes

- dde3b5a: Feature release

  - Enhanced generators now have defaults.
    With one command (`yarn mosaic-create-site create`) it will generate a fully working site with both local and remote sources
  - Fix an issue where we could not clone from the master branch of git repos
  - Migrate to Next 13 image

## 0.1.0-beta.13

### Patch Changes

- d4da1df: incremental improvements

  - move colormode into store
  - ensure breadcrumbs and sidebar data is only added to frontmatter for pages which use a layout that has breadcrumbs or a sidebar
  - improve changeset so it can work standalone without a monorepo
  - resolev json5 vulnerability

## 0.1.0-beta.12

### Patch Changes

- 9ec358b: Upgrade React to version 18 and NextJs to version 13

## 0.1.0-beta.11

### Patch Changes

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
