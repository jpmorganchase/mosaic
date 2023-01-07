# @jpmorganchase/mosaic-serialisers

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
  - @jpmorganchase/mosaic-types@0.1.0-beta.10

## 0.1.0-beta.9

### Minor Changes

- c3fee89: initial components package

  - added JSDOM testing

### Patch Changes

- Updated dependencies [c3fee89]
  - @jpmorganchase/mosaic-types@0.1.0-beta.9

## 0.1.0-beta.8

### Minor Changes

- 2dca0b1: initial release of Mosaic store package

### Patch Changes

- Updated dependencies [2dca0b1]
  - @jpmorganchase/mosaic-types@0.1.0-beta.8

## 0.1.0-beta.7

### Minor Changes

- f82c397: Initial release of theme and client side search

  We are iterating towards deploying our site code.

  This release includes

  - initial work for client-side search support
  - Mosaic theme.

### Patch Changes

- Updated dependencies [f82c397]
  - @jpmorganchase/mosaic-types@0.1.0-beta.7

## 0.1.0-beta.6

### Patch Changes

- c103b24: Release fixes for snapshot serve
- Updated dependencies [c103b24]
  - @jpmorganchase/mosaic-types@0.1.0-beta.6

## 0.1.0-beta.5

### Patch Changes

- 61a246c: This releases add support for generate / build and serve snapshots
- Updated dependencies [61a246c]
  - @jpmorganchase/mosaic-types@0.1.0-beta.5

## 0.1.0-beta.4

### Patch Changes

- bd285df: added dist to package.json
- Updated dependencies [bd285df]
  - @jpmorganchase/mosaic-types@0.1.0-beta.4

## 0.1.0-beta.3

### Patch Changes

- 457df5e: switch to public package
- Updated dependencies [457df5e]
  - @jpmorganchase/mosaic-types@0.1.0-beta.3

## 0.1.0-beta.2

### Patch Changes

- e1bbbe7: Initial release of Mosaic Core file-system.

  Mosaic is a content aggregating service which pulls content from heterogeneous data sources.

- 4b2bc51: pipped to 0.1.0-beta.1 for publishing to NPM
- Updated dependencies [e1bbbe7]
- Updated dependencies [4b2bc51]
  - @jpmorganchase/mosaic-types@0.1.0-beta.2

## 0.1.0

### Patch Changes

- e1bbbe7: Initial release of Mosaic Core file-system.

  Mosaic is a content aggregating service which pulls content from heterogeneous data sources.

- Updated dependencies [e1bbbe7]
- Updated dependencies [bbc853c]
  - @jpmorganchase/mosaic-types@0.1.0
