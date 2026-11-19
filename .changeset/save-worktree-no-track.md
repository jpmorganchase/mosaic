---
'@jpmorganchase/mosaic-source-git-repo': patch
---

Create content-save branches without an upstream, so concurrent saves no longer
fail when Git can't lock the shared repository config.
