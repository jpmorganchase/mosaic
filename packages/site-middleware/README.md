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

## New pages

`createNewPageHandler()` tells the content editor's New Page dialog whether new pages can be created in a folder. Mount it at `src/app/api/content/new-page/route.ts`; the dialog asks `GET /api/content/new-page?folder=/docs/guides` and keeps Create disabled until the answer is `{ "writable": true }`. Pass `transformSharedConfig` if your catch-all page changes the shared config before checking it, such as the reference site's dev capability bypass. Without the route, the dialog doesn't check. When the CLI publishes creation metadata (below), the handler answers from it without reading any folder's shared config.

`getNewPageSharedConfig()` resolves creation capability from `mosaic-new-page-sources.json` then, for a folder new pages can be created in, supplies the nearest folder's layout configuration. The CLI serves this metadata without caching and includes it in snapshots. It lists public mount prefixes for sources with a `save` workflow, in source order; the longest matching prefix wins, including when the source has no index at its mount. Internal namespaces do not determine public ownership. Active namespace restrictions also restrict this metadata. These are UI hints: workflow ownership and authorization are checked again when saving.

Each folder `getNewPageSharedConfig()` searches is a separate read, a request to the content server in active mode. It searches at most `MAX_NEW_PAGE_CONFIG_LOOKUPS` (32) folders, and none for a folder that can't take new pages, so call it only for requests that can create a page, such as a signed-in editor's `?new=1`. Pass it the same `transformSharedConfig` as the handler, so a folder the transform makes writable still gets its layout configuration.

Older content servers and snapshots without this file retain the shared-config fallback. Update the CLI and rebuild snapshots to get source-based eligibility for folders without index pages.

## Search

`createSearchHandler()` serves records through an App Router route. `loadSearchRecords()` reads the generated records directly. The browser-safe `./search` entry exports `createSearchIndex`, and `./search/highlight` exports text highlighting without loading the search engine. The built-in header uses `SearchProvider` from `mosaic-site-components`; search data no longer passes through content stores or page loaders.
