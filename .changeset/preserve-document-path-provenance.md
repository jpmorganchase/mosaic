---
'@jpmorganchase/mosaic-plugins': patch
'@jpmorganchase/mosaic-schemas': patch
'@jpmorganchase/mosaic-site-middleware': patch
'@jpmorganchase/mosaic-types': patch
---

Keep literal percent signs in source filenames distinct from escapes in authored
permalinks when resolving page aliases and generating links. New search records
carry the public pathname where needed. New Markdown
bundles and discovery manifests use version 2 with encoded public pathnames.
Updated handlers and static builds continue to accept version 1 snapshots.
