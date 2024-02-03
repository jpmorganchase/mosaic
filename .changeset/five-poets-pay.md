---
'@jpmorganchase/mosaic-core': patch
'@jpmorganchase/mosaic-plugins': patch
'@jpmorganchase/mosaic-site': patch
'@jpmorganchase/mosaic-types': patch
---

### Feature

Add new `afterNamespaceSourceUpdate` plugin lifecycle method.

This method is identical to `afterUpdate` but will **only** run if the `shouldUpdateNamespaceSources` lifecycle method returns `true`.
