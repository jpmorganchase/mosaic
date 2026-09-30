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
    ├── css/                    # global styles (imported from layout.tsx only)
    ├── fonts/                  # next/font wiring
    ├── lib/                    # site origin, route validation, dev live-reload bus
    └── app/
        ├── layout.tsx          # root layout, global CSS, theme script
        ├── providers.tsx       # 'use client' providers + per-route <StoreShell>
        ├── page.tsx            # / → redirect to /mosaic/index
        ├── not-found.tsx       # global 404
        ├── error.tsx           # route error boundary (must be 'use client')
        ├── robots.ts           # robots.txt generation
        ├── sitemap.ts          # sitemap.xml generation
        ├── [...route]/         # catch-all route
        │   ├── page.tsx        # loads content, gates the editor, renders the page
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

| Command                              | Mode                                         | Output                                       |
| ------------------------------------ | -------------------------------------------- | -------------------------------------------- |
| `yarn build`                         | `snapshot-file` (default, `.env.production`) | Node server, content from local snapshot dir |
| `MOSAIC_MODE=active yarn build`      | `active`                                     | Dynamic Node server, pulls content live      |
| `MOSAIC_MODE=snapshot-s3 yarn build` | `snapshot-s3`                                | Node server, content from S3 bucket          |
| `yarn build:static:file`             | `snapshot-file` + `MOSAIC_OUTPUT=export`     | Static `out/` directory, no Node runtime     |
| `yarn build:static:s3`               | `snapshot-s3` + `MOSAIC_OUTPUT=export`       | Static `out/` directory, no Node runtime     |

See [`docs/configure/modes/`](../../docs/configure/modes/index.mdx) for
the full mode documentation and
[`docs/configure/modes/static-export.mdx`](../../docs/configure/modes/static-export.mdx)
for the static export details.

## Dev / preview

```bash
yarn serve                  # active mode, with mosaic content server
yarn serve:snapshot:file    # snapshot-file mode against ./snapshots
yarn serve:snapshot:s3      # snapshot-s3 mode against your configured bucket
yarn e2e                    # Playwright end-to-end suite
yarn gen:snapshot           # produce a fresh snapshot under ./snapshots
```

Local development needs no extra configuration: `.env.development` holds
the dev defaults (including placeholder secrets and the fake dev login).
Next.js never loads that file for `next build` / `next start`, and the
site refuses its placeholder secrets when `NODE_ENV=production`. Put
personal overrides in `.env.local` (gitignored).

## Environment variables

Set these per deployment (for example in your hosting provider's
environment settings). None of them should be committed with real values.

| Variable                                          | Purpose                                                                                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `MOSAIC_MODE`                                     | `active` (`next dev` default), `snapshot-file` (`next build` / `next start` default) or `snapshot-s3`.                                      |
| `MOSAIC_ACTIVE_MODE_URL`                          | Mosaic CLI content server, e.g. `http://mosaic-fs:8080` (active mode).                                                                      |
| `MOSAIC_SNAPSHOT_DIR`                             | Snapshot folder for `snapshot-file` (defaults to `snapshots/latest` via `.env`).                                                            |
| `NEXT_PUBLIC_SITE_URL`                            | Canonical origin for metadata, `sitemap.xml` and `robots.txt`.                                                                              |
| `MOSAIC_REVALIDATE_SECRET`                        | Shared secret for `POST /api/revalidate`; the CLI sends it with `MOSAIC_REVALIDATE_URL`.                                                    |
| `MOSAIC_ACTIVE_MODE_CACHE`                        | `true` caches active-mode reads until the CLI's revalidate call. Only when that call reaches every site instance.                           |
| `AUTH_SECRET`, `MOSAIC_AUTH_ENABLED`              | Enable Auth.js (the editor sign-in). Generate the secret with `openssl rand -base64 32`.                                                    |
| `GITHUB_ID`, `GITHUB_SECRET`                      | GitHub OAuth app for sign-in.                                                                                                               |
| `MOSAIC_EDITORS`                                  | Who may sign in and edit: comma-separated emails, `@domains` or `*`. GitHub emails must be verified. **Unset means nobody in production.**  |
| `NEXT_PUBLIC_ENABLE_LOGIN`                        | `true` shows the Login control and editor buttons.                                                                                          |
| `MOSAIC_WORKFLOWS_URL`, `MOSAIC_WORKFLOWS_SECRET` | WebSocket URL of the CLI's `/workflows` endpoint and the shared secret it requires (the same value as the CLI's `MOSAIC_WORKFLOWS_SECRET`). |
| `MOSAIC_WORKFLOWS_TIMEOUT_MS`                     | How long a save may run before it is reported as failed (default 5 minutes).                                                                |

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
   Auth.js configuration and no-auth deployments still render.
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
4. **Skip `headers()` and `searchParams` in snapshot builds.** Calling
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

## Migrating an older Mosaic site

If you have an existing Mosaic site on the Pages Router (`src/pages/`),
port it to the layout above: `app/layout.tsx` + `app/providers.tsx`
instead of `_app.tsx`, `app/[...route]/page.tsx` (using the
`@jpmorganchase/mosaic-site-middleware` loaders) instead of
`getServerSideProps`, `next/navigation` instead of `next/router`, and
route handlers under `app/api/`. See the
[static-export docs](../../docs/configure/modes/static-export.mdx) for
the export target.
