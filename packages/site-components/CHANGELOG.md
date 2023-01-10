# @jpmorganchase/mosaic-site-components

## 0.1.0-beta.10

### Patch Changes

- af2f579: Converted repo to ESM and Salt DS nomenclature

  - Switch UITK nomenclature to Salt DS
    Upgraded to first stable version of Salt DS version 1.0.0
  - CommonJS code switched to ESM and upgraded to Node 16
  - Removed example-nextjs-ssr package as un-required, can be replaced by documentation
  - Sites can now generate immutable snapshots of content that loads content like a SGS (statically generated site)
    Snapshots can be used as a serverless solution when deployed to Vercel.
  - New Middleware package `@jpmorganchase/mosaic-site-middleware`

- Updated dependencies [af2f579]
  - @jpmorganchase/mosaic-components@0.1.0-beta.10
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.10
  - @jpmorganchase/mosaic-open-api-component@0.1.0-beta.10
  - @jpmorganchase/mosaic-site-middleware@0.1.0-beta.10
  - @jpmorganchase/mosaic-store@0.1.0-beta.10
  - @jpmorganchase/mosaic-theme@0.1.0-beta.10
