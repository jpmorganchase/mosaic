---
'@jpmorganchase/mosaic-site-components': patch
---

Keep `SearchProvider`'s browser index when its options are written inline

`SearchProvider` recreated its search client whenever `indexOptions` changed
identity, so inline `groupBy` or `pageRank` functions downloaded the records
and rebuilt the browser index on every render. It now uses the latest
`groupBy` and `pageRank` without rebuilding, and only rebuilds the index when
the synonyms change. When `SearchProvider` has no `namespace`, `SearchInput`
uses the first segment of the current URL, so results from the section being
read rank first. The `SearchProvider` entry point still doesn't import
`next/navigation`, so it keeps loading outside Next.js.
