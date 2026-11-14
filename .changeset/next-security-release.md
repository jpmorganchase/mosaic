---
'@jpmorganchase/mosaic-content-editor-plugin': patch
'@jpmorganchase/mosaic-layouts': patch
'@jpmorganchase/mosaic-site-components': patch
'@jpmorganchase/mosaic-site-middleware': patch
---

Require a Next.js release with the November 2026 security fixes

The `next` peer dependency now requires `^16.4.5` (or `^15.5.29` for the
content editor), the first releases that fix GHSA-pc58-hwjq-p385,
GHSA-7qx7-33qx-rqx2, GHSA-f3mh-rxg3-f5g2 and four `use cache` advisories.
Sites on an earlier 16.4 release should upgrade Next.js.
