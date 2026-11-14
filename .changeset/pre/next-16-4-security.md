---
'@jpmorganchase/mosaic-content-editor-plugin': patch
'@jpmorganchase/mosaic-layouts': patch
'@jpmorganchase/mosaic-site-components': patch
'@jpmorganchase/mosaic-site-middleware': patch
---

Upgrade Next.js to 16.4.2

Next.js 16.3.8 and earlier are affected by
[GHSA-p3m5-59mp-jv5r](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r)
(denial of service through Server Actions) and
[GHSA-2464-fhr4-w9xw](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw)
(remote code execution in Image Optimization with SVG files). Both are fixed
in 16.4.1 and 15.5.28.

`@jpmorganchase/mosaic-layouts`, `@jpmorganchase/mosaic-site-components` and
`@jpmorganchase/mosaic-site-middleware` now require `next@^16.4.2`, and the
`next` peer range of `@jpmorganchase/mosaic-content-editor-plugin` is now
`^15.5.28 || ^16.4.1`.
