# @jpmorganchase/mosaic-source-storybook

## 0.1.0-beta.57

### Patch Changes

- d214d112: Add catch-all default exports for

  - `@jpmorganchase/mosaic-store`
  - `@jpmorganchase/mosaic-theme`
  - `@jpmorganchase/mosaic-workflows`

  This resolves an issue when running tests from an external repo which depends on these packages

- Updated dependencies [d214d112]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.57
  - @jpmorganchase/mosaic-source-http@0.1.0-beta.57
  - @jpmorganchase/mosaic-types@0.1.0-beta.57

## 0.1.0-beta.56

### Patch Changes

- 6d30e29f: Add new Storybook source

  Storybook stories can be extracted from Storybook and embedded into Mosaic pages.

  The stories are extracted based on a configured filter or matching tags.

  With a page created for each Story, the author can create a dynamic index of matching stories.

  eg. An index of patterns which match a specific tag

- Updated dependencies [6d30e29f]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.56
  - @jpmorganchase/mosaic-source-http@0.1.0-beta.56
  - @jpmorganchase/mosaic-types@0.1.0-beta.56
