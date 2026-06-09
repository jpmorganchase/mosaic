# Mosaic Site Middleware

`@jpmorganchase/mosaic-site-middleware` contains the server-side
middleware functions and request-pipeline runner that a Mosaic site uses
to assemble per-page props (resolved MDX, sitemap, search index, session,
etc.).

Middleware functions are **server-side only** and cannot be run in the
browser.

## Installation

```bash
yarn add @jpmorganchase/mosaic-site-middleware
```

## Primary API (App Router)

A Mosaic site running on the Next.js App Router wires the middleware
chain inside its catch-all RSC route:

```tsx
// src/app/[...route]/page.tsx
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import {
  fromAppRouter,
  runMiddleware,
  withMosaicMode,
  withMDXContent,
  withSession,
  withSearchIndex,
  withSharedConfig
} from '@jpmorganchase/mosaic-site-middleware';

export default async function Page({ params }: { params: Promise<{ route: string[] }> }) {
  const [{ route }, hdrs] = await Promise.all([params, headers()]);
  const ctx = fromAppRouter({
    pathname: '/' + route.join('/'),
    headers: hdrs
  });

  const result = await runMiddleware(ctx, [
    withMosaicMode,
    withSharedConfig,
    withSession,
    withMDXContent,
    withSearchIndex
  ]);

  if (result.kind === 'redirect') redirect(result.destination);
  if (result.kind === 'not-found') notFound();
  if (result.kind === 'error') throw new Error(result.message);
  return <BodyServer {...result.props} />;
}
```

### `fromAppRouter({ pathname, search?, headers })`

Builds a `MosaicRequestContext` from an App Router server-component
request. `headers` is the value returned by Next's `headers()`. Returns a
context object that every `with*` middleware understands.

### `runMiddleware(ctx, middlewares, options?)`

Runs the middleware chain in order and returns a discriminated union:

```text
| { kind: 'props'; props }
| { kind: 'redirect'; destination; permanent? }
| { kind: 'not-found' }
| { kind: 'error'; status; message? }
```

The runner is router-agnostic. It is the **only** entry point site code
should call.

## Server-rendered MDX

`compileMdxRsc(source, { scope, components })` compiles an MDX document
on the server and returns `{ content, frontmatter, exports, error? }`
where `content` is a `JSX.Element` you can render directly inside an RSC.
No `next-mdx-remote` is shipped to the browser.

The editor's in-browser preview uses a separate client entry
(`next-mdx-remote-client`) loaded via `next/dynamic({ ssr: false })`, so
non-editor readers never pay for it.

## Static export

`loadSitemap()` reads `sitemap.xml` from the active snapshot source
(local snapshot dir for `snapshot-file`, S3 bucket for `snapshot-s3`)
and returns host-stripped pathnames. Use it from `generateStaticParams`
in the catch-all route to enumerate every page at build time. See the
[static export docs](../../docs/configure/modes/static-export.mdx) for
the full pattern.

## Pages Router?

**Not supported.** The legacy `fromGetServerSidePropsContext` /
`fromPagesRouter` adapter was removed once every first-party Mosaic site
cut over to the App Router. If you are migrating a site that is still on
`src/pages/`, follow the Pages→App migration recipe — there is no
compatibility shim to lean on.

`createMiddlewareRunner` still exists in this package, but it is an
internal helper used by the individual `with*` middleware bodies (which
historically typed their `context` parameter as
`GetServerSidePropsContext`). Site code should call `runMiddleware`, not
`createMiddlewareRunner`, directly.

## Included middleware

- `withMosaicMode` — resolves `MOSAIC_MODE` + content URL up-front and
  carries them on the context.
- `withSharedConfig` — loads `shared-config.json` from the content
  source.
- `withSession` — server-side Auth.js session resolution (via `auth()`).
- `withMDXContent` — fetches the MDX source for the current pathname,
  resolves frontmatter `$ref` aliases, and runs the configured remark /
  rehype plugin chain.
- `withSearchIndex` — loads the per-namespace search index for the
  search UI.
- `middlewarePresets` — opinionated default chains you can spread into
  your `runMiddleware` call.
