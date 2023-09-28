---
'@jpmorganchase/mosaic-core': patch
'@jpmorganchase/mosaic-plugins': patch
'@jpmorganchase/mosaic-types': patch
---

### Feature

Add new plugin lifecycle method `shouldUpdateNamespaceSources`.

This method is called when a source emits new pages and there is another source(s) that share the same namespace.

If `shouldUpdateNamespaceSources` returns `true` then the other source(s), i.e., not the source that triggered the initial update, will call `afterUpdate` again.
