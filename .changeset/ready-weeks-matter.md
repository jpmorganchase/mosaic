---
'@jpmorganchase/mosaic-content-editor-plugin': patch
'@jpmorganchase/mosaic-open-api-component': patch
'@jpmorganchase/mosaic-site-preset-styles': patch
'@jpmorganchase/mosaic-sitemap-component': patch
'@jpmorganchase/mosaic-source-storybook': patch
'@jpmorganchase/mosaic-from-http-request': patch
'@jpmorganchase/mosaic-site-components': patch
'@jpmorganchase/mosaic-site-middleware': patch
'@jpmorganchase/mosaic-source-git-repo': patch
'@jpmorganchase/mosaic-source-readme': patch
'@jpmorganchase/mosaic-source-figma': patch
'@jpmorganchase/mosaic-components': patch
'@jpmorganchase/mosaic-layouts': patch
'@jpmorganchase/mosaic-plugins': patch
'@jpmorganchase/mosaic-icons': patch
'@jpmorganchase/mosaic-store': patch
'@jpmorganchase/mosaic-theme': patch
'@jpmorganchase/mosaic-core': patch
'@jpmorganchase/mosaic-site': patch
'@jpmorganchase/mosaic-cli': patch
---

Modernise the build and remove un-used site generator

- update yarn to 4.10.3
- pip dependencies to allow for internal JPM build
- removed `create-site` as un-used, `site` directory can be copied, refer to docs for more details
- remove packages `@mosaicjs/create-site` and `@jpmorganchase/mosaic-standard-generator` as they are no longer needed
- `fsconfig.js` has moved from `@jpmorganchase/mosaic-standard-generator` to `@jpmorganchase/mosaic-cli`

```diff
- import mosaicConfig from '@jpmorganchase/mosaic-standard-generator/dist/fs.config.js';
+ import mosaicConfig from '@jpmorganchase/mosaic-cli/fs.config.js';
```
