---
'@jpmorganchase/mosaic-create-site': patch
'@jpmorganchase/mosaic-site': patch
'@jpmorganchase/mosaic-standard-generator': patch
'@jpmorganchase/mosaic-cli': patch
'@jpmorganchase/mosaic-components': patch
'@jpmorganchase/mosaic-labs-components': patch
'@jpmorganchase/mosaic-content-editor-plugin': patch
'@jpmorganchase/mosaic-core': patch
'@jpmorganchase/mosaic-from-http-request': patch
'@jpmorganchase/mosaic-layouts': patch
'@jpmorganchase/mosaic-open-api-component': patch
'@jpmorganchase/mosaic-plugins': patch
'@jpmorganchase/mosaic-schemas': patch
'@jpmorganchase/mosaic-serialisers': patch
'@jpmorganchase/mosaic-site-components': patch
'@jpmorganchase/mosaic-site-middleware': patch
'@jpmorganchase/mosaic-site-preset-styles': patch
'@jpmorganchase/mosaic-source-git-repo': patch
'@jpmorganchase/mosaic-source-http': patch
'@jpmorganchase/mosaic-source-local-folder': patch
'@jpmorganchase/mosaic-store': patch
'@jpmorganchase/mosaic-theme': patch
'@jpmorganchase/mosaic-types': patch
'@jpmorganchase/mosaic-workflows': patch
---

Update docs with quick-start guide

Sample docs now include a 'quick-start' guide to onboarding to AWS.

Also

- generator default directory is the current directory
- after generating a site, it will run `yarn` in the created directory. This simplifies the generator call to just `yarn mosaic-create-site`
