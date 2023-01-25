---
'@jpmorganchase/mosaic-from-http-request': patch
'@jpmorganchase/mosaic-source-http': patch
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
'@jpmorganchase/mosaic-source-git-repo': patch
'@jpmorganchase/mosaic-source-local-folder': patch
'@jpmorganchase/mosaic-standard-generator': patch
'@jpmorganchase/mosaic-store': patch
'@jpmorganchase/mosaic-theme': patch
'@jpmorganchase/mosaic-types': patch
'@jpmorganchase/mosaic-workflows': patch
---

initial release of HTTP Source package.

An HTTP source accepts a collection of endpoints and a path to a transformer module.  
The response from fetching is transformed and merged together into 1 single collection of pages.
Should 1 of the endpoints request fail then it will have no impact on the other requests.
