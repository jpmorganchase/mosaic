---
'@jpmorganchase/mosaic-components': minor
'@jpmorganchase/mosaic-site': minor
'@jpmorganchase/mosaic-standard-generator': minor
'@jpmorganchase/mosaic-theme': minor
'@jpmorganchase/mosaic-cli': minor
'@jpmorganchase/mosaic-labs-components': minor
'@jpmorganchase/mosaic-content-editor-plugin': minor
'@jpmorganchase/mosaic-core': minor
'@jpmorganchase/mosaic-create-site': minor
'@jpmorganchase/mosaic-from-http-request': minor
'@jpmorganchase/mosaic-layouts': minor
'@jpmorganchase/mosaic-open-api-component': minor
'@jpmorganchase/mosaic-plugins': minor
'@jpmorganchase/mosaic-schemas': minor
'@jpmorganchase/mosaic-serialisers': minor
'@jpmorganchase/mosaic-site-components': minor
'@jpmorganchase/mosaic-site-middleware': minor
'@jpmorganchase/mosaic-site-preset-styles': minor
'@jpmorganchase/mosaic-source-git-repo': minor
'@jpmorganchase/mosaic-source-http': minor
'@jpmorganchase/mosaic-source-local-folder': minor
'@jpmorganchase/mosaic-store': minor
'@jpmorganchase/mosaic-types': minor
'@jpmorganchase/mosaic-workflows': minor
---

The theme contract provided by the `@jpmorganchase/mosaic-theme` package now uses locally scoped variable names via a Vanilla Extract [Theme Contract](https://vanilla-extract.style/documentation/api/create-theme-contract/). Previously the theme variables were globally scoped resulting in conflicts with other design systems.
