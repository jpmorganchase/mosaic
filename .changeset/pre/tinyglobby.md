---
'@jpmorganchase/mosaic-core': minor
'@jpmorganchase/mosaic-plugins': minor
'@jpmorganchase/mosaic-source-local-folder': minor
'@jpmorganchase/mosaic-types': minor
---

Replace `fast-glob` with `tinyglobby`, which drops `micromatch` and `braces` (SNYK-JS-BRACES-19963945) from Mosaic's runtime dependencies. Globs match the same files as before. The `glob` methods on `IFileAccess` and `IVolume` now take `tinyglobby` options and return `string[]`; fast-glob-only options such as `stats` and `objectMode` are no longer accepted.
