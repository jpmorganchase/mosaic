---
'@jpmorganchase/mosaic-components': patch
'@jpmorganchase/mosaic-open-api-component': patch
---

Fix hydration errors from `IsomorphicSuspense`

`IsomorphicSuspense` returned its fallback on the server but a Suspense
boundary in the browser, so hydration failed on every page that used it,
including the sitemap, live code examples, data tables and the OpenAPI
component, and React re-rendered the whole page in the browser. It now
renders the fallback on the server and while hydrating, then its children
inside a Suspense boundary.
