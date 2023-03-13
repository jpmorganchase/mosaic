# @jpmorganchase/mosaic-source-http

## 0.1.0-beta.25

### Minor Changes

- 93e9b07: The theme contract provided by the `@jpmorganchase/mosaic-theme` package now uses locally scoped variable names via a Vanilla Extract [Theme Contract](https://vanilla-extract.style/documentation/api/create-theme-contract/). Previously the theme variables were globally scoped resulting in conflicts with other design systems.

### Patch Changes

- a36219c: - Next/Prev page buttons were not appearing at the bottom of a page sequence
  - Removed redundant snapshot page api
- Updated dependencies [a36219c]
- Updated dependencies [93e9b07]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.25
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.25
  - @jpmorganchase/mosaic-types@0.1.0-beta.25

## 0.1.0-beta.24

### Patch Changes

- 049d9af: 1. Pip Salt version 2. Issues 155, make 500 error more specific 3. button and sidebar styles 4. search opt-out
- Updated dependencies [049d9af]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.24
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.24
  - @jpmorganchase/mosaic-types@0.1.0-beta.24

## 0.1.0-beta.23

### Patch Changes

- 513d45f: Sidebar behavior and styling changes.
  Add Client-side search feature.
  Relax node engine requirements.
  Removal of patches from the site package.
  Update site generator templates.
- Updated dependencies [513d45f]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.23
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.23
  - @jpmorganchase/mosaic-types@0.1.0-beta.23

## 0.1.0-beta.22

### Patch Changes

- be89e4f: fix markdown tables and update generator's Salt patches

  - Salt patches in generator were out of sync with Mosaic repo
  - Markdown now support github flavoured markdown, such as Tables

- Updated dependencies [be89e4f]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.22
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.22
  - @jpmorganchase/mosaic-types@0.1.0-beta.22

## 0.1.0-beta.21

### Patch Changes

- f75fd5e: fix sidebar which was generated after `beforeSend` had completed
- Updated dependencies [f75fd5e]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.21
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.21
  - @jpmorganchase/mosaic-types@0.1.0-beta.21

## 0.1.0-beta.20

### Patch Changes

- 9c7b8ff: pip to beta.20
- Updated dependencies [9c7b8ff]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.20
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.20
  - @jpmorganchase/mosaic-types@0.1.0-beta.20

## 0.1.0-beta.19

### Patch Changes

- ad06d4c: ensure spinner is removed after page has loaded
- Updated dependencies [ad06d4c]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.19
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.19
  - @jpmorganchase/mosaic-types@0.1.0-beta.19

## 0.1.0-beta.18

### Patch Changes

- 066efed: Update docs with quick-start guide

  Sample docs now include a 'quick-start' guide to onboarding to AWS.

  Also

  - generator default directory is the current directory
  - after generating a site, it will run `yarn` in the created directory. This simplifies the generator call to just `yarn mosaic-create-site`

- Updated dependencies [066efed]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.18
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.18
  - @jpmorganchase/mosaic-types@0.1.0-beta.18

## 0.1.0-beta.17

### Patch Changes

- b2f6d52: Fix `pre` block code block rendering
- Updated dependencies [b2f6d52]
  - @jpmorganchase/mosaic-from-http-request@0.1.0-beta.17
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.17
  - @jpmorganchase/mosaic-types@0.1.0-beta.17

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
