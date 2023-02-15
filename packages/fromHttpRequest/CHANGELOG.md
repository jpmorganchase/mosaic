# @jpmorganchase/mosaic-from-http-request

## 0.1.0-beta.22

### Patch Changes

- be89e4f: fix markdown tables and update generator's Salt patches

  - Salt patches in generator were out of sync with Mosaic repo
  - Markdown now support github flavoured markdown, such as Tables

## 0.1.0-beta.21

### Patch Changes

- f75fd5e: fix sidebar which was generated after `beforeSend` had completed

## 0.1.0-beta.20

### Patch Changes

- 9c7b8ff: pip to beta.20

## 0.1.0-beta.19

### Patch Changes

- ad06d4c: ensure spinner is removed after page has loaded

## 0.1.0-beta.18

### Patch Changes

- 066efed: Update docs with quick-start guide

  Sample docs now include a 'quick-start' guide to onboarding to AWS.

  Also

  - generator default directory is the current directory
  - after generating a site, it will run `yarn` in the created directory. This simplifies the generator call to just `yarn mosaic-create-site`

## 0.1.0-beta.17

### Patch Changes

- b2f6d52: Fix `pre` block code block rendering

## 0.1.0-beta.16

### Patch Changes

- 3a5c88a: add missing `@types/node` dependency for generator

## 0.1.0-beta.15

### Patch Changes

- aaaf255: initial release of HTTP Source package.

  An HTTP source accepts a collection of endpoints and a path to a transformer module.
  The response from fetching is transformed and merged together into 1 single collection of pages.
  Should 1 of the endpoints request fail then it will have no impact on the other requests.
