---
'@jpmorganchase/mosaic-plugins': patch
'@jpmorganchase/mosaic-source-figma': patch
'@jpmorganchase/mosaic-source-readme': patch
'@jpmorganchase/mosaic-source-storybook': patch
---

Align source APIs for Figma, Storybook and Readme

Updates to related sources so that have consistent APIs.

- `tags` is now visible in the `meta`, previously deleted
- use `meta.tags` rather than rely on a CSV copy in `meta.data.tags`
- move un-neccessary `meta.data` to config (e.g `source`)
- removed `additionalTags` and `additionalData` from Storybook source and use `meta` instead
