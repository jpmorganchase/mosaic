---
'@jpmorganchase/mosaic-core': patch
'@jpmorganchase/mosaic-cli': patch
---

Use the published page's source for raw editor reads, save defaults and workflow writes.
When sources publish the same path, all three operations now follow the actual mounted
filesystem order, including sources that finish starting in a different order. Scoped
content servers also keep workflow defaults and writes within their allowed namespaces.
New pages continue to choose the source with the longest matching prefix.
