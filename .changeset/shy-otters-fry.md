---
'@jpmorganchase/mosaic-cli': patch
'@jpmorganchase/mosaic-components': patch
'@jpmorganchase/mosaic-content-editor-plugin': patch
'@jpmorganchase/mosaic-core': patch
'@jpmorganchase/mosaic-create-site': patch
'@jpmorganchase/mosaic-layouts': patch
'@jpmorganchase/mosaic-open-api-component': patch
'@jpmorganchase/mosaic-plugins': patch
'@jpmorganchase/mosaic-schemas': patch
'@jpmorganchase/mosaic-serialisers': patch
'@jpmorganchase/mosaic-site-components': patch
'@jpmorganchase/mosaic-site-middleware': patch
'@jpmorganchase/mosaic-site-preset-styles': patch
'@jpmorganchase/mosaic-source-git-repo': patch
'@jpmorganchase/mosaic-source-local-folder': patch
'@jpmorganchase/mosaic-standard-generator': patch
'@jpmorganchase/mosaic-store': patch
'@jpmorganchase/mosaic-theme': patch
'@jpmorganchase/mosaic-types': patch
'@jpmorganchase/mosaic-workflows': patch
---

Converted repo to ESM and Salt DS nomenclature

- Switch UITK nomenclature to Salt DS
  Upgraded to first stable version of Salt DS version 1.0.0
- CommonJS code switched to ESM and upgraded to Node 16
- Removed example-nextjs-ssr package as un-required, can be replaced by documentation
- Sites can now generate immutable snapshots of content that loads content like a SGS (statically generated site)
  Snapshots can be used as a serverless solution when deployed to Vercel.
- New Middleware package `@jpmorganchase/mosaic-site-middleware`
