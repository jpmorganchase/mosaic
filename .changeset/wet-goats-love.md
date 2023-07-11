---
'@jpmorganchase/mosaic-plugins': patch
---

Fix: the `remarkMdx` plugin wasn't applied inside the Mosaic `FragmentPlugin` and `PropsTablePlugin` causing incorrect parsing of complex React components included in page content.
