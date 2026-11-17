---
'@jpmorganchase/mosaic-content-editor-plugin': patch
'@jpmorganchase/mosaic-site-components': patch
'@jpmorganchase/mosaic-site-middleware': patch
---

Refer to the reference site's catch-all route as `[namespace]/[...route]`

The reference site now uses a required catch-all with a separate
`[namespace]/page.tsx`, so comments and READMEs that pointed at
`[namespace]/[[...route]]` were updated. Hosts that copied the optional
catch-all should do the same: Next.js treats an optional catch-all whose
only value is `index` as empty, so `/<namespace>/index` was served from
the `/<namespace>` page and client prefetches of it never settled.
