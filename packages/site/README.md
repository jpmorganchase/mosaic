# Mosaic Site

`@jpmorganchase/mosaic-site` is the reference Next.js site that consumes
the rest of the Mosaic packages. It is intended to be **copied** into
your own repo as the starting point for a Mosaic-powered documentation
site — there is no scaffolding CLI.

The site runs on the **Next.js App Router** (`src/app/`).

## File tree

```
packages/site/
├── .env                        # values shared by every environment (no secrets)
├── .env.development            # `next dev` / CLI dev defaults, incl. placeholder secrets
├── .env.production             # `next build` / `next start` defaults (snapshot-file mode)
├── mosaic.config.mjs           # content sources, plugins, settings
├── next.config.js              # three-config split: base / dynamic / export
├── package.json
├── scripts/
│   └── static-export-route-stubs.mjs   # apply/revert API stubs for static export
└── src/
    ├── auth.ts                 # Auth.js v5 (handlers, auth, signIn, signOut) + editor allowlist
    ├── instrumentation.ts      # validates the env when the server starts
    ├── css/                    # global styles (imported from layout.tsx only)
    ├── fonts/                  # next/font wiring
    ├── lib/                    # env config, site origin, route validation, dev live-reload bus
    └── app/
        ├── layout.tsx          # root layout, global CSS, theme script
        ├── providers.tsx       # 'use client' providers + per-route <StoreShell>
        ├── page.tsx            # / → redirect to /mosaic/index
        ├── not-found.tsx       # global 404 (no server data; see NotFoundBody.tsx)
        ├── NotFoundBody.tsx    # 404 body; loads header data only when shown
        ├── notFoundChromeAction.ts # Server Action: 404 header data
        ├── error.tsx           # route error boundary (must be 'use client')
        ├── global-error.tsx    # root layout error boundary
        ├── robots.ts           # robots.txt generation
        ├── sitemap.ts          # sitemap.xml generation
        ├── [...route]/         # catch-all route
        │   ├── page.tsx        # loads content, gates the editor, renders the page
        │   ├── resolveContent.ts  # route → content, folder→index redirects, canonical route
        │   ├── BodyServer.tsx  # renders compiled MDX with <MdxRenderer>
        │   ├── MdxComponents.ts   # MDX-visible component registry
        │   ├── EditorBodyLazy.tsx # client-side lazy wrapper around the editor
        │   ├── EditorBody.tsx     # Lexical editor host (edit / create only)
        │   ├── previewAction.ts   # Server Action: editor preview compile
        │   ├── persistAction.ts   # Server Action: save → workflows backend
        │   ├── CanonicalizeUrl.tsx
        │   └── RouteMetadata.tsx
        └── api/
            ├── auth/[...nextauth]/route.ts   # Auth.js v5 handlers.GET/POST
            ├── content/live/route.ts         # dev-only live-reload stream
            ├── content/ready/route.ts        # dev-only upstream readiness probe
            └── revalidate/route.ts           # cache revalidation webhook
```

## Build modes

The site supports three Mosaic content modes plus a static-export target:

| Command                               | Mode                                         | Output                                       |
| ------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| `yarn build`                          | `snapshot-file` (default, `.env.production`) | Node server, content from local snapshot dir |
| `MOSAIC_MODE=active yarn build`       | `active`                                     | Dynamic Node server, pulls content live      |
| `yarn build:static:file`              | `snapshot-file` + `MOSAIC_OUTPUT=export`     | Static `out/` directory, no Node runtime     |
| `MOSAIC_OUTPUT=standalone yarn build` | any server mode                              | `.next/standalone` server for Docker images  |

See [`docs/configure/modes/`](../../docs/configure/modes/index.mdx) for
the full mode documentation and
[`docs/configure/modes/static-export.mdx`](../../docs/configure/modes/static-export.mdx)
for the static export details.

## Dev / preview

```bash
yarn serve                  # active mode, with mosaic content server
yarn serve:snapshot:file    # snapshot-file mode against ./snapshots
yarn e2e                    # Playwright end-to-end suite
yarn gen:snapshot           # produce a fresh snapshot under ./snapshots
```

Local development needs no extra configuration: `.env.development` holds
the dev defaults (including placeholder secrets and the fake dev login).
Next.js never loads that file for `next build` / `next start`, and
`mosaic.config.mjs` only loads it for the CLI when `NODE_ENV=development`,
which the `serve`, `debug` and `gen:snapshot` scripts set. The site also
refuses its placeholder secrets when `NODE_ENV=production`. Put personal
overrides in `.env.local` (gitignored).

## Environment variables

Set these per deployment (for example in your hosting provider's
environment settings). None of them should be committed with real values.

**Validated at startup.** `src/lib/config.ts` checks every variable below
when a server starts (`next start`, `next dev`, the standalone
`server.js`), not during `next build`, so an image can be built without its
runtime secrets. With `NODE_ENV=production` an invalid configuration
stops the server (exit code 1) with one error that lists every problem as
`NAME: reason`; in development the same list is logged and the server
keeps running. Empty
values count as unset, and flags only accept `true` or `false`.

`NEXT_PUBLIC_*` values are inlined when you build, so set them for
`next build`.

| Variable                                        | Values                                                | Default                                                  | Purpose                                                                                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MOSAIC_MODE`                                   | `active` or `snapshot-file`                           | `active` (`.env.production` sets `snapshot-file`)        | Where content comes from.                                                                                                                                |
| `MOSAIC_ACTIVE_MODE_URL`                        | http(s) URL. Required in `active` mode                | –                                                        | Mosaic CLI content server, e.g. `http://mosaic-fs:8080`.                                                                                                 |
| `MOSAIC_SNAPSHOT_DIR`                           | Path. Required in `snapshot-file` mode                | `snapshots/latest` (set in `.env`)                       | Snapshot folder, relative to the site.                                                                                                                   |
| `MOSAIC_OUTPUT`                                 | `export` or `standalone`                              | Unset: a build for `next start`                          | Build target (see `next.config.js`). `export` needs a snapshot mode.                                                                                     |
| `NEXT_PUBLIC_SITE_URL`                          | Absolute http(s) URL                                  | `http://localhost:3000`, with a warning in production    | Canonical origin for metadata, `sitemap.xml` and `robots.txt`.                                                                                           |
| `NEXT_PUBLIC_ENABLE_LOGIN`                      | `true` or `false`                                     | `false`                                                  | Shows the Login control and editor buttons.                                                                                                              |
| `NEXT_PUBLIC_OPTIMIZE_IMAGES`                   | `true` or `false`                                     | `false` (`.env.production` sets `true`)                  | Lets Next.js optimise images rendered by `site-components`.                                                                                              |
| `MOSAIC_ACTIVE_MODE_CACHE`                      | `true` or `false`                                     | `false`                                                  | `true` caches active-mode reads until the CLI's revalidate call. Only when that call reaches every site instance.                                        |
| `MOSAIC_DISABLE_LOADER_CACHE`                   | `true` or `false`                                     | `false`                                                  | `true` bypasses the cross-request content cache. For local work on snapshot files.                                                                       |
| `MOSAIC_REVALIDATE_SECRET`                      | Secret                                                | Unset: `POST /api/revalidate` answers 503                | Shared secret for `POST /api/revalidate`; the CLI sends it to `MOSAIC_REVALIDATE_URL`. In production the `.env.development` placeholder counts as unset. |
| `MOSAIC_AUTH_ENABLED`                           | `true` or `false`                                     | `false`                                                  | Turns sign-in (Auth.js) on. Setting `AUTH_SECRET` alone also turns it on, with a warning.                                                                |
| `AUTH_SECRET` (or the legacy `NEXTAUTH_SECRET`) | Secret                                                | –                                                        | Auth.js secret. Generate it with `openssl rand -base64 32`. In production the `.env.development` placeholder counts as unset and auth stays off.         |
| `GITHUB_ID`, `GITHUB_SECRET`                    | Text and secret                                       | –                                                        | GitHub OAuth app for sign-in.                                                                                                                            |
| `MOSAIC_EDITORS`                                | Comma-separated emails, `@domains` or `*`             | Unset: everyone in development, **nobody in production** | Who may sign in and edit. GitHub emails must be verified.                                                                                                |
| `MOSAIC_WORKFLOWS_URL`                          | ws(s) or http(s) URL. Needs `MOSAIC_WORKFLOWS_SECRET` | Unset: saves are reported as not configured              | The CLI's `/workflows` endpoint.                                                                                                                         |
| `MOSAIC_WORKFLOWS_SECRET`                       | Secret                                                | –                                                        | Shared secret for saves; the same value as the CLI's `MOSAIC_WORKFLOWS_SECRET`.                                                                          |
| `MOSAIC_WORKFLOWS_TIMEOUT_MS`                   | Whole number of milliseconds, 1 to 2147483647         | `300000` (5 minutes)                                     | How long a save may run before it is reported as failed.                                                                                                 |
| `MOSAIC_DEV_FAKE_AUTH`                          | `true` or `false`                                     | `false`                                                  | Development only: a sign-in that accepts anyone. Ignored in production.                                                                                  |
| `MOSAIC_DEV_BYPASS_CAPABILITY_GATE`             | `true` or `false`                                     | `false`                                                  | Development only: shows the editor on every page. Ignored in production.                                                                                 |

`SITE_URL` is read by `mosaic.config.mjs` (the CLI's sitemap plugin), not
by the site. For the CLI's own variables, see
[Admin](../../docs/configure/admin/index.mdx#environment-variables).

## Customising

Three files cover the vast majority of customisations:

1. **`src/app/layout.tsx`** — global `<html>`/`<body>`, CSS imports, and
   `<head>` content (theme script, fonts).
2. **`src/app/providers.tsx`** — the client-side provider stack (Salt
   theme, Mosaic store, Auth.js session) and the per-route
   `<StoreShell>` (layout / image / link providers).
3. **`src/app/[...route]/MdxComponents.ts`** — the registry of components
   reachable from MDX. This is where you add your own components (see
   [Custom Components](../../docs/configure/theme/custom-components.mdx)).

For global CSS, see
[Custom CSS](../../docs/configure/theme/custom-css.mdx).

## Critical patterns to preserve when copying

If you copy this directory into your own repo, **do not change these
patterns** without understanding why they exist — every one of them is
the resolution of a real bug.

1. **Mount `<SessionProvider>` without a server-resolved session.** The
   client fetches it lazily, so the root layout doesn't depend on
   Auth.js configuration and no-auth deployments still render. The
   layout passes only the build-time `AUTH_ENABLED` flag, so no-auth
   deployments use `session={null}` and skip the session request.
2. **Pass the server's edit state to `<StoreShell isEditing>`.** It
   reaches `LayoutProvider`, so view-mode pages never call
   `useSearchParams()` — which would make statically prerendered pages
   fall back to client rendering, with no layout or navigation in the
   HTML.
3. **Import editor pieces from subpaths**
   (`@jpmorganchase/mosaic-content-editor-plugin/useEditMode`, …) and
   lazy-load the editor from a Client Component (`EditorBodyLazy.tsx`).
   The package root re-exports the whole Lexical editor, and
   `next/dynamic` doesn't code-split when called from a Server
   Component.
4. **Skip `connection()` and `searchParams` in snapshot builds.** Calling
   them opts the route out of static pre-rendering. Use a cheap
   conditional **before** the `await`.
5. **Keep the auth checks inside the Server Actions.** Server Actions
   are public endpoints; `persistContent` and `compilePreview` check
   the session and `MOSAIC_EDITORS` themselves, and `persistContent`
   validates every route before forwarding it.
6. **Use the `next.config.js` three-config split.** Static export
   cannot tolerate `redirects()` or optimised images; the regular
   build wants both. Don't collapse them back into one config.
7. **Run the API-route stub apply/revert around static exports.** Next 16
   refuses to emit `route.ts` handlers under `output: 'export'` unless
   they declare `dynamic = 'force-static'` as a string literal. The
   `scripts/static-export-route-stubs.mjs` script handles this
   automatically inside `build:static:*`; do not call `next build`
   with `MOSAIC_OUTPUT=export` directly.
8. **Keep `not-found.tsx` free of server data loading.** Next.js renders
   it as part of every page response, not only for missing pages, so
   anything it awaits runs on every request. `<NotFoundBody>` loads the
   404 page's header data from the browser instead (static exports bake
   it in at build time).

## Migrating an older Mosaic site

If your site still uses the Pages Router (`src/pages/`), follow
[Migrate to the App Router](../../docs/getting-started/migrate-to-app-router.mdx).
It maps every old file to its new location and lists the package API,
Auth.js v5, environment variable, editor, CLI and deployment changes.
For the export target, see the
[static-export docs](../../docs/configure/modes/static-export.mdx).
