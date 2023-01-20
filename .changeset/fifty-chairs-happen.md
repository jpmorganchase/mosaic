---
'@jpmorganchase/mosaic-site': patch
'@jpmorganchase/mosaic-source-git-repo': patch
'@jpmorganchase/mosaic-standard-generator': patch
'@jpmorganchase/mosaic-cli': patch
'@jpmorganchase/mosaic-components': patch
'@jpmorganchase/mosaic-labs-components': patch
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
'@jpmorganchase/mosaic-source-local-folder': patch
'@jpmorganchase/mosaic-store': patch
'@jpmorganchase/mosaic-theme': patch
'@jpmorganchase/mosaic-types': patch
'@jpmorganchase/mosaic-workflows': patch
---

Feature release

- Enhanced generators now have defaults.
  With one command (`yarn mosaic-create-site create`) it will generate a fully working site with both local and remote sources
- Fix an issue where we could not clone from the master branch of git repos
- Migrate to Next 13 image
