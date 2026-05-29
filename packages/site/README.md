# Mosaic Site

`@jpmorganchase/mosaic-site` is the reference Next.js site that consumes
the rest of the Mosaic packages. It is intended to be **copied** into
your own repo as the starting point for a Mosaic-powered documentation
site — there is no scaffolding CLI.

The site runs on **Next.js App Router** (`src/app/`). The legacy Pages
Router layout (`src/pages/`) has been removed.

## File tree

```
packages/site/
├── mosaic.config.mjs           # content sources, plugins, settings
├── next.config.js              # three-config split: base / dynamic / export
├── package.json
├── scripts/
│   └── static-export-route-stubs.mjs   # apply/revert API stubs for static export
└── src/
    ├── auth.ts                 # Auth.js v5: handlers, auth, signIn, signOut
    ├── css/                    # global styles (imported from layout.tsx only)
    ├── fonts/                  # next/font wiring
    ├── lib/
    │   └── siteOrigin.ts       # helpers for absolute URLs in metadata/robots
    └── app/
        ├── layout.tsx          # root layout, global CSS, session seeding
        ├── providers.tsx       # 'use client' provider stack
        ├── page.tsx            # / → redirect to /mosaic/index
        ├── loading.tsx         # navigation spinner (replaces router.events)
        ├── not-found.tsx       # global 404
        ├── error.tsx           # global 500 (must be 'use client')
        ├── robots.ts           # robots.txt generation
        ├── sitemap.ts          # sitemap.xml generation
        ├── [...route]/         # catch-all RSC route
        │   ├── page.tsx        # runs middleware, renders <BodyServer/>
        │   ├── BodyServer.tsx  # async RSC: compiles MDX, renders content
        │   ├── BodyClient.ts   # 'use client' re-export boundary
        │   ├── MdxRenderer.tsx
        │   ├── MdxComponents.ts   # MDX-visible component registry
        │   ├── RouteMetadata.tsx  # generates <Metadata/> from frontmatter
        │   └── not-found.tsx
        └── api/
            ├── auth/[...nextauth]/route.ts   # Auth.js v5 handlers.GET/POST
            ├── content/preview/route.ts      # editor preview endpoint
            └── revalidate/route.ts           # ISR revalidate webhook
```

## Build modes

The site supports three Mosaic content modes plus a static-export target:

| Command                                | Mode                                     | Output                                       |
| -------------------------------------- | ---------------------------------------- | -------------------------------------------- |
| `yarn build`                           | `active` (default)                       | Dynamic Node server, pulls content live      |
| `MOSAIC_MODE=snapshot-file yarn build` | `snapshot-file`                          | Node server, content from local snapshot dir |
| `MOSAIC_MODE=snapshot-s3 yarn build`   | `snapshot-s3`                            | Node server, content from S3 bucket          |
| `yarn build:static:file`               | `snapshot-file` + `MOSAIC_OUTPUT=export` | Static `out/` directory, no Node runtime     |
| `yarn build:static:s3`                 | `snapshot-s3` + `MOSAIC_OUTPUT=export`   | Static `out/` directory, no Node runtime     |

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

## Customising

Three files cover the vast majority of customisations:

1. **`src/app/layout.tsx`** — global `<html>`/`<body>`, CSS imports,
   `<head>` content (FOUC scripts, fonts), and the synchronous `await auth()` call that seeds `<SessionProvider>`.
2. **`src/app/providers.tsx`** — the client-side provider stack: Salt
   theme, Mosaic store, Auth.js session, layout / image / link
   providers.
3. **`src/app/[...route]/MdxComponents.ts`** — the registry of components
   reachable from MDX. This is where you add your own components (see
   [Custom Components](../../docs/configure/theme/custom-components.mdx)).

For global CSS, see
[Custom CSS](../../docs/configure/theme/custom-css.mdx).

## Critical patterns to preserve when copying

If you copy this directory into your own repo, **do not change these
patterns** without understanding why they exist — every one of them is
the resolution of a real bug discovered during the App Router migration.

1. **Seed the session in `layout.tsx`, not in `providers.tsx`.** Resolve
   `await auth()` server-side in the root layout and pass it as a prop
   to `<SessionProvider session={session}>`. An unseeded
   `SessionProvider` enters its "loading" state during parallel SSG
   workers and races React's internal dispatcher, producing the
   non-deterministic `TypeError: Cannot read properties of null (reading 'useState')` crash. In static-export builds
   (`MOSAIC_OUTPUT=export`) pass `session={null}` unconditionally — do
   not call `auth()`.
2. **Await `params` and `headers()` in parallel** in the catch-all
   `page.tsx`. They are independent; serialising them costs a request
   round-trip.
3. **Skip `headers()` entirely in snapshot builds.** Calling it trips
   Next's dynamic-API detector and disables static pre-render even
   for `force-static` routes. Use a cheap conditional **before** the
   `await`.
4. **Import `Metadata` from
   `@jpmorganchase/mosaic-site-components/Metadata`**, not through the
   package barrel. The barrel pulls Salt DS and other client-only
   modules into the server graph.
5. **Use the `next.config.js` three-config split.** Static export
   cannot tolerate `redirects()` or optimised images; the regular
   build wants both. Don't collapse them back into one config.
6. **Run the API-route stub apply/revert around static exports.** Next 16
   refuses to emit `route.ts` handlers under `output: 'export'` unless
   they declare `dynamic = 'force-static'` as a string literal. The
   `scripts/static-export-route-stubs.mjs` script handles this
   automatically inside `build:static:*`; do not call `next build`
   with `MOSAIC_OUTPUT=export` directly.

## Migrating an older Mosaic site

If you have an existing Mosaic site on the Pages Router (`src/pages/`)
that needs to be brought up to the App Router layout, follow the
Pages → App migration recipe in the changeset for this release
(`.changeset/bright-routers-render.md`) and in the consumer-facing
[static-export docs](../../docs/configure/modes/static-export.mdx).

There is no compatibility shim. The legacy
`fromGetServerSidePropsContext` / `fromPagesRouter` adapter in
`@jpmorganchase/mosaic-site-middleware` was removed when the reference
site cut over. Migrating consumers should port straight to
`fromAppRouter` + `runMiddleware`.
