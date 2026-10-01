---
'@jpmorganchase/mosaic-store': patch
'@jpmorganchase/mosaic-site-middleware': patch
'@jpmorganchase/mosaic-site-components': patch
'@jpmorganchase/mosaic-content-editor-plugin': patch
---

Fix issues found in a review of the App Router site

**`@jpmorganchase/mosaic-store`**

- Add `reseedStore(store, state)`. It replaces a store's page state with
  a new seed while keeping the colour mode and actions; keys missing
  from the new seed return to their defaults. The reference site's
  `StoreShell` uses it so the sidebar, table of contents and breadcrumbs
  follow `router.refresh()`, which previously only updated the page
  body.

**`@jpmorganchase/mosaic-site-middleware`**

- In snapshot modes, `getMdxRaw` and `getSharedConfig` decode
  percent-encoded routes before reading files or S3 keys, so pages whose
  names contain spaces or non-ASCII characters are found. Decoded paths
  that would leave the snapshot (`..` or `.` segments, backslashes, NUL
  bytes) are treated as not found.

**`@jpmorganchase/mosaic-site-components`**

- The header's Login link no longer causes a hydration mismatch. Its
  fallback `href` is built from the router pathname (which the server
  and the browser agree on) instead of `window.location`; the click
  handler still sends the full path, query and hash as the callback.

**`@jpmorganchase/mosaic-content-editor-plugin`**

- The `next` peer dependency is now `^15.5.24 || ^16.3.3`. Earlier
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
