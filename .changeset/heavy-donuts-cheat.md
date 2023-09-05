---
'@jpmorganchase/mosaic-site': patch
'@jpmorganchase/mosaic-site-components': patch
'@jpmorganchase/mosaic-store': patch
---

## Fix

When a page does not specify a property that is part of the store default props, we use what the default props specify and not what is currently in the store.
