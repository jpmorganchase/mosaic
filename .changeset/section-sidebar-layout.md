---
'@jpmorganchase/mosaic-site-middleware': patch
---

Send each section's sidebar tree once

- Add `getSidebarData(folder, mode, contentUrl)`. It loads the
  `sidebar.json` that `SidebarPlugin` writes for a sidebar root folder,
  from the Mosaic server or a snapshot (file or S3), and is cached and
  invalidated with `MOSAIC_CONTENT_CACHE_TAG` like the other loaders.

**Reference site (`packages/site`)**

- The catch-all route moves to `app/[namespace]/[section]/[[...route]]`.
  The new `[namespace]/[section]/layout.tsx` loads the section's sidebar
  tree once, and pages whose `sidebarData` is that tree leave their copy
  out, so navigating within a section no longer re-sends the whole tree
  (about 11 KB uncompressed per page in this site's `configure` section).
- If `next dev` panics with "Failed to write app endpoint" after you
  update, delete `packages/site/.next`. Turbopack's development cache
  still refers to the old route folder.
