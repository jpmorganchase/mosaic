---
'@jpmorganchase/mosaic-cli': patch
---

Merge all contributors to colliding JSON files when building snapshots. Select scoped sources before generation so sitemap, search and Markdown artifacts are included and contain only the requested namespaces. Reject empty or unknown scopes before clearing an existing snapshot.
