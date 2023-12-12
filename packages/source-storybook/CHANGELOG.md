# @jpmorganchase/mosaic-source-storybook

## 0.1.0-beta.60

### Patch Changes

- a3da0830: New Readme Source

  This source pulls a single Readme.md from a remote Source repo.
  Typically used for third-party repos which exist already or don't want to
  create a full document hierachy and use `@jpmorganchase/mosaic-source-git-repo`.
  By pulling a single page, we can add metadata to that page via the source's config.
  It's also more performant as we do not need to pull a whole source repo.

- Updated dependencies [a3da0830]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.60
  - @jpmorganchase/mosaic-source-http@0.1.0-beta.60
  - @jpmorganchase/mosaic-types@0.1.0-beta.60

## 0.1.0-beta.59

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.59
- @jpmorganchase/mosaic-source-http@0.1.0-beta.59
- @jpmorganchase/mosaic-types@0.1.0-beta.59

## 0.1.0-beta.58

### Patch Changes

- c8db46dc: ## HTTP Source `noProxy` option

  The `noProxy` option is a regex used to check if an endpoint in the `endpoints` collection should create an http proxy agent for the request.

  ## `createHttpSource` `configuredRequests` option

  When an http source is created using the `createHttpSource` function, instead of supplying a collection of endpoints, a `configuredRequests` option can be used to provide a collection of [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) objects.

  This gives full control over the request configuration to the user.

  _Should both `endpoints` and `configuredRequests` be provided then endpoints will take precedence._

  ## Storybook Source

  Storybook config in the `stories` option can now specify a `proxyEndpoint`.

- Updated dependencies [c8db46dc]
  - @jpmorganchase/mosaic-source-http@0.1.0-beta.58
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.58
  - @jpmorganchase/mosaic-types@0.1.0-beta.58

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
