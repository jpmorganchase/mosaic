# @jpmorganchase/mosaic-source-http

## 0.1.0-beta.16

### Patch Changes

- 3a5c88a: add missing `@types/node` dependency for generator
- Updated dependencies [3a5c88a]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.16
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.16
  - @jpmorganchase/mosaic-types@0.1.0-beta.16

## 0.1.0-beta.15

### Patch Changes

- aaaf255: initial release of HTTP Source package.

  An HTTP source accepts a collection of endpoints and a path to a transformer module.
  The response from fetching is transformed and merged together into 1 single collection of pages.
  Should 1 of the endpoints request fail then it will have no impact on the other requests.

- Updated dependencies [aaaf255]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.15
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.15
  - @jpmorganchase/mosaic-types@0.1.0-beta.15
