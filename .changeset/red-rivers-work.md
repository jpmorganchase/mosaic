---
'@jpmorganchase/mosaic-site': patch
'@jpmorganchase/mosaic-source-readme': patch
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
'@jpmorganchase/mosaic-site-components': patch
'@jpmorganchase/mosaic-site-middleware': patch
'@jpmorganchase/mosaic-site-preset-styles': patch
'@jpmorganchase/mosaic-source-git-repo': patch
'@jpmorganchase/mosaic-source-http': patch
'@jpmorganchase/mosaic-source-local-folder': patch
'@jpmorganchase/mosaic-source-storybook': patch
'@jpmorganchase/mosaic-standard-generator': patch
'@jpmorganchase/mosaic-store': patch
'@jpmorganchase/mosaic-theme': patch
'@jpmorganchase/mosaic-types': patch
'@jpmorganchase/mosaic-workflows': patch
---

New Readme Source

This source pulls a single Readme.md from a remote Source repo.
Typically used for third-party repos which exist already or don't want to
create a full document hierachy and use `@jpmorganchase/mosaic-source-git-repo`.
By pulling a single page, we can add metadata to that page via the source's config.
It's also more performant as we do not need to pull a whole source repo.
