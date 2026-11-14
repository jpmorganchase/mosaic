---
'@jpmorganchase/mosaic-store': patch
'@jpmorganchase/mosaic-site-components': patch
'@jpmorganchase/mosaic-components': patch
'@jpmorganchase/mosaic-icons': patch
'@jpmorganchase/mosaic-open-api-component': patch
'@jpmorganchase/mosaic-sitemap-component': patch
'@jpmorganchase/mosaic-theme': patch
---

Align React peer dependencies with supported consumers. The store, icons, theme,
OpenAPI component and sitemap component accept React 18 or 19 and matching type
packages. Components and site components require React 19 types, matching their
existing React 19 runtime peer and the Next.js 16 site integration.
