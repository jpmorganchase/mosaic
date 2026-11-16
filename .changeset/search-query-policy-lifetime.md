---
'@jpmorganchase/mosaic-site-components': patch
'@jpmorganchase/mosaic-site-middleware': patch
---

Separate the browser search index cache from per-query grouping, ranking and limits. Updating SearchProvider policies refreshes the displayed results without downloading or rebuilding the index. Pending searches retain their original policies when callbacks change or are removed, replacing mutable callback refs and their synchronization effect.

The search engine now accepts optional `groupBy` and `pageRank` query overrides; existing index-level policies remain the defaults.
