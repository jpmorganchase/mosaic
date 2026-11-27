# Mosaic Site Middleware

`@jpmorganchase/mosaic-site-middleware` contains the server-side loaders
a Mosaic App Router site uses to read content (MDX pages, shared config,
the search index, the sitemap) from whichever source the current
`MOSAIC_MODE` points at, plus the MDX pipeline that compiles pages for
the browser.

The root entry is **server-only**. The `./search` and `./search/highlight` entries are also safe to import in the browser.

## Installation

```bash
yarn add @jpmorganchase/mosaic-site-middleware
```

`next` (16) and `react` (19) are peer dependencies.

## Usage (App Router)

```tsx
// src/app/[namespace]/[...route]/page.tsx
import { notFound, redirect } from 'next/navigation';
import {
  getMdxRaw,
  getSharedConfig,
  resolveMosaicMode,
  serializeMdxForClient
} from '@jpmorganchase/mosaic-site-middleware';

export default async function Page({ params }: { params: Promise<{ route: string[] }> }) {
  const { route } = await params;
  const pathname = '/' + route.join('/');
  const { mode, contentUrl } = resolveMosaicMode();

  const [mdx, sharedConfig] = await Promise.all([
    getMdxRaw(pathname, mode, contentUrl),
    getSharedConfig(pathname, mode, contentUrl)
  ]);
  if (mdx.kind === 'redirect') redirect(mdx.destination);
  if (mdx.kind === 'not-found') notFound();

  const source = await serializeMdxForClient(mdx.raw);
  // Render `source` with a client `<MDXClient />` renderer, e.g.
  // `createMdxRenderer` from `@jpmorganchase/mosaic-site-components`.
}
```

See `packages/site/src/app/[namespace]/[...route]/page.tsx` for the full reference
implementation (edit gating, folder → index redirects, metadata).

## Loaders

| Export                                           | Returns                                                                     |
| ------------------------------------------------ | --------------------------------------------------------------------------- |
| `resolveMosaicMode()`                            | `{ mode, contentUrl }` from `MOSAIC_MODE` / `MOSAIC_<MODE>_MODE_URL`.       |
| `getMdxRaw(pathname, mode, contentUrl)`          | `{ kind: 'mdx', raw, frontmatter }`, `{ kind: 'redirect' }` or `not-found`. |
| `getSharedConfig(pathname, mode, contentUrl)`    | The subtree's shared config (header, footer, …) or `undefined`.             |
| `getMdxRawSource(pathname, mode, contentUrl)`    | The page's on-disk bytes (active mode only), for the editor.                |
| `getTagSuggestions(mode, contentUrl)`            | Tag names known to the content server, for the editor.                      |
| `loadSitemap()`                                  | Every page pathname, e.g. for `generateStaticParams`.                       |
| `MOSAIC_CONTENT_CACHE_TAG` (also `./cache-tags`) | The cache tag to invalidate with `revalidateTag`.                           |

### Caching

Each loader is deduplicated per request with `React.cache` and, across
requests, with `unstable_cache` tagged `MOSAIC_CONTENT_CACHE_TAG`:

- Snapshot mode always caches. Invalidate with
  `revalidateTag(MOSAIC_CONTENT_CACHE_TAG, { expire: 0 })`, e.g. from a
  webhook route.
- Active mode reads the live Mosaic CLI on every request unless
  `MOSAIC_ACTIVE_MODE_CACHE=true`. Enable that only when the CLI's
  revalidate notification reaches every site instance.
- The editor's raw source loader always reads the CLI on each request so
  reopening an editor after a save conflict can load the current source.
- Negative results (not-found pages, missing files, empty lookups) are
  never stored.
- `MOSAIC_DISABLE_LOADER_CACHE=true` bypasses the cross-request cache
  entirely (local development).

## MDX pipeline

`serializeMdxForClient(source, options?)` compiles MDX on the server
(GFM, heading slugs, server-side shiki highlighting) into a JSON-safe
`{ compiledSource, frontmatter, scope }` payload for `<MDXClient />`
from `next-mdx-remote-client`. Compile errors are returned on
`result.error` with line/column information. Results for the default
pipeline are cached in-process by content hash; treat them as read-only.

## Pages Router?

**Not supported.** The Pages Router middleware (`withMDXContent`,
`withSearchIndex`, `withSharedConfig`, `withSession`, …) was removed
when the reference site moved to the App Router. Port
`getServerSideProps` code to the loaders above.

## Search

`createSearchHandler()` serves records through an App Router route. `loadSearchRecords()` reads the generated records directly. The browser-safe `./search` entry exports `createSearchIndex`, and `./search/highlight` exports text highlighting without loading the search engine. The built-in header uses `SearchProvider` from `mosaic-site-components`; search data no longer passes through content stores or page loaders.
