---
'@jpmorganchase/mosaic-layouts': patch
'@jpmorganchase/mosaic-site-components': patch
'@jpmorganchase/mosaic-content-editor-plugin': patch
---

Let a persistent App Router layout render the app header

- Add `FrameProvider`, `useFrame` and `LayoutHeader`. A host that renders
  the header once in a layout (so it stays mounted while readers navigate)
  renders it inside `<LayoutHeader>` and wraps the page in
  `<FrameProvider value={{ header: true }}>`; `LayoutBase` then leaves its
  own header out. Without a provider, layouts render the header as before.
- `@jpmorganchase/mosaic-site-components`: `Drawer` (the header's mobile
  menu) closes when the pathname changes, so it also closes when the
  header stays mounted across navigations.
- `@jpmorganchase/mosaic-content-editor-plugin`: the New Page dialog
  starts a new draft on each page, so it pre-selects the current folder
  instead of keeping the previous page's values when it stays mounted.

**Reference site (`packages/site`)**

- The optional catch-all route moves under `app/[namespace]/[[...route]]/`. The new
  `[namespace]/layout.tsx` loads the namespace's shared config and search
  index once and keeps the header mounted across navigations, so the
  header (logo, menus, search, session controls) is no longer rebuilt on
  every page change. Pages pass their canonical content route, per-folder
  header overrides and edit state to it with `<FrameSync>`, keeping
  relative links and images correct for index URLs and aliases.
  Initial server HTML uses the layout's fallback config and its matching
  index route; the page's canonical route and config take over before
  the first client paint.
- Single-segment documents and aliases still resolve through the content
  loaders. The first URL segment is a frame boundary, not a requirement
  that sources have a URL prefix. Known top-level index shorthand URLs
  are included in static exports too.
- Client-side navigation within a namespace no longer re-sends the search
  index with every page (Next.js may still inline it into prefetches when
  it is small).
- 404s inside a namespace render within the namespace layout, header
  included, without loading any data; `notFoundChromeAction` is removed.
- Sidebars continue to be loaded per page; this change only persists the
  header and its search data.
