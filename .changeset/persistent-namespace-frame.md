---
'@jpmorganchase/mosaic-layouts': patch
---

Let a persistent App Router layout render the app header

- Add `FrameProvider`, `useFrame` and `LayoutHeader`. A host that renders
  the header once in a layout (so it stays mounted while readers navigate)
  renders it inside `<LayoutHeader>` and wraps the page in
  `<FrameProvider value={{ header: true }}>`; `LayoutBase` then leaves its
  own header out. Without a provider, layouts render the header as before.

**Reference site (`packages/site`)**

- The catch-all route moves under `app/[namespace]/`. The new
  `[namespace]/layout.tsx` loads the namespace's shared config and search
  index once and keeps the header mounted across navigations, so the
  header (logo, menus, search, session controls) is no longer rebuilt on
  every page change. Pages pass per-folder header overrides and their edit
  state to it with `<FrameSync>`.
- Client-side navigation within a namespace no longer re-sends the search
  index with every page (Next.js may still inline it into prefetches when
  it is small).
- 404s inside a namespace render within the namespace layout, header
  included, without loading any data; `notFoundChromeAction` is removed.
