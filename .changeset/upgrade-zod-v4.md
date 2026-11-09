---
'@jpmorganchase/mosaic-schemas': patch
---

Upgrade Mosaic's configuration and source schemas to Zod 4 while preserving schedule defaults and infinite plugin priorities. Custom code that composes Mosaic's exported schemas or passes a schema to `validateMosaicSchema` should use Zod 4.
