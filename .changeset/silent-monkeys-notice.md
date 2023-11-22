---
'@jpmorganchase/mosaic-store': patch
'@jpmorganchase/mosaic-theme': patch
'@jpmorganchase/mosaic-workflows': patch
'@jpmorganchase/mosaic-cli': patch
'@jpmorganchase/mosaic-components': patch
'@jpmorganchase/mosaic-labs-components': patch
'@jpmorganchase/mosaic-content-editor-plugin': patch
'@jpmorganchase/mosaic-core': patch
'@jpmorganchase/mosaic-create-site': patch
'@jpmorganchase/mosaic-from-http-request': patch
'@jpmorganchase/mosaic-layouts': patch
'@jpmorganchase/mosaic-open-api-component': patch
'@jpmorganchase/mosaic-plugins': patch
'@jpmorganchase/mosaic-schemas': patch
'@jpmorganchase/mosaic-serialisers': patch
'@jpmorganchase/mosaic-site': patch
'@jpmorganchase/mosaic-site-components': patch
'@jpmorganchase/mosaic-site-middleware': patch
'@jpmorganchase/mosaic-site-preset-styles': patch
'@jpmorganchase/mosaic-source-git-repo': patch
'@jpmorganchase/mosaic-source-http': patch
'@jpmorganchase/mosaic-source-local-folder': patch
'@jpmorganchase/mosaic-source-storybook': patch
'@jpmorganchase/mosaic-standard-generator': patch
'@jpmorganchase/mosaic-types': patch
---

Add catch-all default exports for

- `@jpmorganchase/mosaic-store`
- `@jpmorganchase/mosaic-theme`
- `@jpmorganchase/mosaic-workflows`

This resolves an issue when running tests from an external repo which depends on these packages
