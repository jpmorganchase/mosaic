---
'@jpmorganchase/mosaic-core': patch
'@jpmorganchase/mosaic-schemas': patch
'@jpmorganchase/mosaic-site': patch
---

### Feature

Multiple instances of the same Plugin can be used by setting `allowMultiple` to true for all plugin definitions in the `mosaic.config.mjs` file that use that plugin.

If there are multiple plugin definitions and only some have `allowMultiple` set to true then those are used and the definitions that do not set `allowMultiple` are discarded.
