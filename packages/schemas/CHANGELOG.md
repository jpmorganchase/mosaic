# @jpmorganchase/mosaic-schemas

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
- 41e8af3: Upgrade Mosaic's configuration and source schemas to Zod 4 while preserving schedule defaults, unlimited retries, and infinite plugin priorities. Custom code that composes Mosaic's exported schemas or passes a schema to `validateMosaicSchema` should use Zod 4.

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

## 0.1.0-beta.95

## 0.1.0-beta.94

## 0.1.0-beta.93

## 0.1.0-beta.92

## 0.1.0-beta.91

## 0.1.0-beta.90

## 0.1.0-beta.89

## 0.1.0-beta.88

## 0.1.0-beta.87

### Patch Changes

- 14942195: - switch the default behaviour of schema validation to exit on error
  - improve logging of schema validation errors to prevent silent failures

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

## 0.1.0-beta.52

## 0.1.0-beta.51

## 0.1.0-beta.50

### Patch Changes

- 2f015976: ### Feat

  `enableSourcePush` is now a property of the Mosaic Config file. This functionality was previously configured using an environment variable `process.env.MOSAIC_ENABLE_SOURCE_PUSH`

  ### Fix

  The Admin API that returned the Mosaic config file now strips credentials from git reo sources

  ### Refactor

  Fastify is now used as the web server powering the `serve` functionality of the Mosaic CLI.

## 0.1.0-beta.49

## 0.1.0-beta.48

## 0.1.0-beta.47

### Patch Changes

- 6caa661a: ### Feature

  Multiple instances of the same Plugin can be used by setting `allowMultiple` to true for all plugin definitions in the `mosaic.config.mjs` file that use that plugin.

  If there are multiple plugin definitions and only some have `allowMultiple` set to true then those are used and the definitions that do not set `allowMultiple` are discarded.

## 0.1.0-beta.46

## 0.1.0-beta.45

## 0.1.0-beta.44

## 0.1.0-beta.43

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

- 5cd5a87: ## Feature: Source Retries

  The source retries feature gracefully handles re-requesting content from a source that has thrown an error. Retries follow an exponential back-off strategy and will eventually rethrow the error when all retry attempts have been exhausted.

  The retry configuration is specified as part of the source schedule e.g.

  ```
    schedule: {
      checkIntervalMins: 0.2,
      initialDelayMs: 2000,
      retryDelayMins: 5,
      maxRetries: 30,
      retryEnabled: true
    },
  ```

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
