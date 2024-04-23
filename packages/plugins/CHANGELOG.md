# @jpmorganchase/mosaic-plugins

## 0.1.0-beta.73

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.73
- @jpmorganchase/mosaic-serialisers@0.1.0-beta.73
- @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.73
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.73
- @jpmorganchase/mosaic-types@0.1.0-beta.73

## 0.1.0-beta.72

### Patch Changes

- Updated dependencies [a36a7571]
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.72
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.72
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.72
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.72
  - @jpmorganchase/mosaic-types@0.1.0-beta.72

## 0.1.0-beta.71

### Patch Changes

- c21f28e7: Fix fragments not being picked up by the table of contents plugin
- 30a19145: Fixed tags being broken when using fast-glob@^3.3.0
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.71
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.71
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.71
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.71
  - @jpmorganchase/mosaic-types@0.1.0-beta.71

## 0.1.0-beta.70

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.70
- @jpmorganchase/mosaic-serialisers@0.1.0-beta.70
- @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.70
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.70
- @jpmorganchase/mosaic-types@0.1.0-beta.70

## 0.1.0-beta.69

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.69
- @jpmorganchase/mosaic-serialisers@0.1.0-beta.69
- @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.69
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.69
- @jpmorganchase/mosaic-types@0.1.0-beta.69

## 0.1.0-beta.68

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.68
- @jpmorganchase/mosaic-serialisers@0.1.0-beta.68
- @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.68
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.68
- @jpmorganchase/mosaic-types@0.1.0-beta.68

## 0.1.0-beta.67

### Patch Changes

- 6abf1910: Fixed table of contents indentation
- 30e2f038: Align source APIs for Figma, Storybook and Readme

  Updates to related sources so that have consistent APIs.

  - `tags` is now visible in the `meta`, previously deleted
  - use `meta.tags` rather than rely on a CSV copy in `meta.data.tags`
  - move un-neccessary `meta.data` to config (e.g `source`)
  - removed `additionalTags` and `additionalData` from Storybook source and use `meta` instead
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.67
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.67
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.67
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.67
  - @jpmorganchase/mosaic-types@0.1.0-beta.67

## 0.1.0-beta.66

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.66
- @jpmorganchase/mosaic-serialisers@0.1.0-beta.66
- @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.66
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.66
- @jpmorganchase/mosaic-types@0.1.0-beta.66

## 0.1.0-beta.65

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.65
- @jpmorganchase/mosaic-serialisers@0.1.0-beta.65
- @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.65
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.65
- @jpmorganchase/mosaic-types@0.1.0-beta.65

## 0.1.0-beta.64

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.64
- @jpmorganchase/mosaic-serialisers@0.1.0-beta.64
- @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.64
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.64
- @jpmorganchase/mosaic-types@0.1.0-beta.64

## 0.1.0-beta.63

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.63
- @jpmorganchase/mosaic-serialisers@0.1.0-beta.63
- @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.63
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.63
- @jpmorganchase/mosaic-types@0.1.0-beta.63

## 0.1.0-beta.62

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.62
- @jpmorganchase/mosaic-serialisers@0.1.0-beta.62
- @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.62
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.62
- @jpmorganchase/mosaic-types@0.1.0-beta.62

## 0.1.0-beta.61

### Patch Changes

- cec89401: add `pluginTimeout` (20 secs) to fastify to prevent loading timeout
- Updated dependencies [cec89401]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.61
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.61
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.61
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.61
  - @jpmorganchase/mosaic-types@0.1.0-beta.61

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
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.60
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.60
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.60
  - @jpmorganchase/mosaic-types@0.1.0-beta.60

## 0.1.0-beta.59

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.59
- @jpmorganchase/mosaic-serialisers@0.1.0-beta.59
- @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.59
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.59
- @jpmorganchase/mosaic-types@0.1.0-beta.59

## 0.1.0-beta.58

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.58
- @jpmorganchase/mosaic-serialisers@0.1.0-beta.58
- @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.58
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.58
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
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.57
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.57
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.57
  - @jpmorganchase/mosaic-types@0.1.0-beta.57

## 0.1.0-beta.56

### Patch Changes

- 7c94fb06: Ensure that pages that have subscribed to tags are properly updated when the source of the tagged content is updated.
- 6d30e29f: Add new Storybook source

  Storybook stories can be extracted from Storybook and embedded into Mosaic pages.

  The stories are extracted based on a configured filter or matching tags.

  With a page created for each Story, the author can create a dynamic index of matching stories.

  eg. An index of patterns which match a specific tag

- Updated dependencies [6d30e29f]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.56
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.56
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.56
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.56
  - @jpmorganchase/mosaic-types@0.1.0-beta.56

## 0.1.0-beta.55

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.55
- @jpmorganchase/mosaic-serialisers@0.1.0-beta.55
- @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.55
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.55
- @jpmorganchase/mosaic-types@0.1.0-beta.55

## 0.1.0-beta.54

### Patch Changes

- 5c83b602: ## Feature - Advanced Sidebar Sorting

  Given a directory of pages, you can provide a sidebar sort config in the frontmatter of the directory index page which will be used to sort the other pages in the directory.

  The sort config consists of:

  - field: the path, separated by a '/', to the page metadata you want to use for sorting e.g. title or data/publicationDate
  - dataType: 'string' or 'number' or 'Date'
  - arrange: 'asc' or 'desc'

  Note that a page can still specify its sidebar priority and this will overrule any sort config specified in the index page.

  ## Example

  Let's say you have a "Newsletters" directory which has an index page and multiple newsletter pages in the same directory.

  Each newsletter page has a data property which includes the publication date of the newsletter.

  To order the newsletters in the sidebar in descending order (the newest newsletter first):

  Add the following to the **index** page frontmatter:

  ```
  sharedConfig:
    sidebar:
      sort:
        field: data/publicationDate
        dataType: date
        arrange: desc
  ```

  - @jpmorganchase/mosaic-schemas@0.1.0-beta.54
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.54
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.54
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.54
  - @jpmorganchase/mosaic-types@0.1.0-beta.54

## 0.1.0-beta.53

### Patch Changes

- d7098baa: ### Feature

  Add new `afterNamespaceSourceUpdate` plugin lifecycle method.

  This method is identical to `afterUpdate` but will **only** run if the `shouldUpdateNamespaceSources` lifecycle method returns `true`.

- Updated dependencies [d7098baa]
  - @jpmorganchase/mosaic-types@0.1.0-beta.53
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.53
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.53
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.53
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.53

## 0.1.0-beta.52

### Patch Changes

- Updated dependencies [9ad7418c]
  - @jpmorganchase/mosaic-types@0.1.0-beta.52
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.52
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.52
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.52
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.52

## 0.1.0-beta.51

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.51
- @jpmorganchase/mosaic-serialisers@0.1.0-beta.51
- @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.51
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.51
- @jpmorganchase/mosaic-types@0.1.0-beta.51

## 0.1.0-beta.50

### Patch Changes

- 2f015976: ### Feat

  `enableSourcePush` is now a property of the Mosaic Config file. This functionality was previously configured using an environment variable `process.env.MOSAIC_ENABLE_SOURCE_PUSH`

  ### Fix

  The Admin API that returned the Mosaic config file now strips credentials from git reo sources

  ### Refactor

  Fastify is now used as the web server powering the `serve` functionality of the Mosaic CLI.

- Updated dependencies [2f015976]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.50
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.50
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.50
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.50
  - @jpmorganchase/mosaic-types@0.1.0-beta.50

## 0.1.0-beta.49

### Patch Changes

- 425b5a00: ### Feature

  Add new plugin lifecycle method `shouldUpdateNamespaceSources`.

  This method is called when a source emits new pages and there is another source(s) that share the same namespace.

  If `shouldUpdateNamespaceSources` returns `true` then the other source(s), i.e., not the source that triggered the initial update, will call `afterUpdate` again.

- Updated dependencies [425b5a00]
  - @jpmorganchase/mosaic-types@0.1.0-beta.49
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.49
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.49
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.49
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.49

## 0.1.0-beta.48

### Patch Changes

- 0eca1d6e: ### Fixes

  - Fix types of `IUnionVolume` so that the `promises` property is correct

  - Fix Breadcrumb generation so that the global filesystem is used to identify the full breadcrumbs path.

- Updated dependencies [0eca1d6e]
  - @jpmorganchase/mosaic-types@0.1.0-beta.48
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.48
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.48
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.48
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.48

## 0.1.0-beta.47

### Patch Changes

- Updated dependencies [6caa661a]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.47
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.47
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.47
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.47
  - @jpmorganchase/mosaic-types@0.1.0-beta.47

## 0.1.0-beta.46

### Patch Changes

- 9a2aacb5: ## Fix

  Support Mosaic `tags` on Windows

  - @jpmorganchase/mosaic-schemas@0.1.0-beta.46
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.46
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.46
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.46
  - @jpmorganchase/mosaic-types@0.1.0-beta.46

## 0.1.0-beta.45

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.45
- @jpmorganchase/mosaic-serialisers@0.1.0-beta.45
- @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.45
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.45
- @jpmorganchase/mosaic-types@0.1.0-beta.45

## 0.1.0-beta.44

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.44
- @jpmorganchase/mosaic-serialisers@0.1.0-beta.44
- @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.44
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.44
- @jpmorganchase/mosaic-types@0.1.0-beta.44

## 0.1.0-beta.43

### Patch Changes

- d3b8b3a: `SharedConfigPlugin` can now apply a shared config to a source that doesn't have one but shares a namespace with 1 that does.
- 7013042: Fix pages that are excluded from the sidebar having no sidebar
- 0ced179: ## Feature

  Any exception raised by plugins during any part of the plugin lifecycle are converted to instances of PluginError and tracked by the source that is running the plugins. This means plugin errors do not cause the source to close and content will continue to be served by Mosaic.

  Plugin authors should be encouraged to throw a `PluginError` as should an error occur when processing a particular page, then the full path to the page can be included in the error descriptor.

  Plugin errors are not currently surfaced to a Mosaic site but can be viewed using the list sources admin API.

  ## Fix

  The `saveContent` plugin lifecycle method is removed. This concept was replaced with workflows some time ago and should have been removed then.

- Updated dependencies [d3b8b3a]
- Updated dependencies [0ced179]
  - @jpmorganchase/mosaic-types@0.1.0-beta.43
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.43
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.43
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.43
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.43

## 0.1.0-beta.42

### Patch Changes

- 3491f29: ## Fixes

  - Update lazy import of swagger-ui in the Mosaic Open API component
  - Tab Component can use title or label props for tab title
  - SharedConfigPlugin ensures closest shared-config.json file in the
    page hierarchy is used to source the shared configuration.

- a62b028: ## Feature

  The SharedConfigPlugin will now merge shared config values.

  - @jpmorganchase/mosaic-schemas@0.1.0-beta.42
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.42
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.42
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.42
  - @jpmorganchase/mosaic-types@0.1.0-beta.42

## 0.1.0-beta.41

### Patch Changes

- Updated dependencies [898c9ad]
- Updated dependencies [5cd5a87]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.41
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.41
  - @jpmorganchase/mosaic-types@0.1.0-beta.41
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.41
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.41

## 0.1.0-beta.40

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.40
- @jpmorganchase/mosaic-serialisers@0.1.0-beta.40
- @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.40
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.40
- @jpmorganchase/mosaic-types@0.1.0-beta.40

## 0.1.0-beta.39

### Patch Changes

- d2ff626: Fix `$RefPlugin` circular ref error when content updates
- 2b3948d: Fix: the `remarkMdx` plugin wasn't applied inside the Mosaic `FragmentPlugin` and `PropsTablePlugin` causing incorrect parsing of complex React components included in page content.
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.39
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.39
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.39
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.39
  - @jpmorganchase/mosaic-types@0.1.0-beta.39

## 0.1.0-beta.38

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.38
- @jpmorganchase/mosaic-serialisers@0.1.0-beta.38
- @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.38
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.38
- @jpmorganchase/mosaic-types@0.1.0-beta.38

## 0.1.0-beta.37

### Minor Changes

- feb5b9e: Add path resolve in order for component path to be correct regardless of the plugin location

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.37
- @jpmorganchase/mosaic-serialisers@0.1.0-beta.37
- @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.37
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.37
- @jpmorganchase/mosaic-types@0.1.0-beta.37

## 0.1.0-beta.36

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.36
- @jpmorganchase/mosaic-serialisers@0.1.0-beta.36
- @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.36
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.36
- @jpmorganchase/mosaic-types@0.1.0-beta.36

## 0.1.0-beta.35

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.35
- @jpmorganchase/mosaic-serialisers@0.1.0-beta.35
- @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.35
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.35
- @jpmorganchase/mosaic-types@0.1.0-beta.35

## 0.1.0-beta.34

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.34
- @jpmorganchase/mosaic-serialisers@0.1.0-beta.34
- @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.34
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.34
- @jpmorganchase/mosaic-types@0.1.0-beta.34

## 0.1.0-beta.33

### Minor Changes

- e6d9594: Adds a a plugin that generates a component props table given a file path e.g. :propsTable{src="../../packages/core/src/button/Button.tsx"}

  It will allow users to embed the table within their mdx pages.

### Patch Changes

- @jpmorganchase/mosaic-schemas@0.1.0-beta.33
- @jpmorganchase/mosaic-serialisers@0.1.0-beta.33
- @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.33
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.33
- @jpmorganchase/mosaic-types@0.1.0-beta.33

## 0.1.0-beta.32

### Patch Changes

- Updated dependencies [a56eadb]
- Updated dependencies [8c854fd]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.32
  - @jpmorganchase/mosaic-types@0.1.0-beta.32
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.32
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.32
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.32

## 0.1.0-beta.31

### Minor Changes

- 0f702ad: Enable reading of environment variables in config files

### Patch Changes

- b609fd0: Added support for containerization of the site and cli as well as providing config for kubernetes development (skaffold)

  ## @jpmorganchase/mosaic-cli

  The cli package has been updated to support containerization.

- Updated dependencies [b609fd0]
- Updated dependencies [5a3a170]
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.31
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.31
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.31
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.31
  - @jpmorganchase/mosaic-types@0.1.0-beta.31

## 0.1.0-beta.30

### Patch Changes

- be5d1b4: Ensure `prefixDir` is an optional source property
- 18ef436: The git repo source no longer generates a double slash between the repo host and repo path.
- Updated dependencies [be5d1b4]
- Updated dependencies [18ef436]
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.30
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.30
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.30
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.30
  - @jpmorganchase/mosaic-types@0.1.0-beta.30

## 0.1.0-beta.29

### Minor Changes

- c78deb4: Flatten Sidebar
  Search Optimisation
  Public Assets Plugin
  TOC Indentation

### Patch Changes

- Updated dependencies [c78deb4]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.29
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.29
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.29
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.29
  - @jpmorganchase/mosaic-types@0.1.0-beta.29

## 0.1.0-beta.28

### Patch Changes

- 27ac914: 1. Layout improvements. 2. Fix: if a user hits a url that lands on a directory, the index file within that directory is resolved as the content. 3. Fix: improve Table of Contents component highlighting.
- Updated dependencies [27ac914]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.28
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.28
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.28
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.28
  - @jpmorganchase/mosaic-types@0.1.0-beta.28

## 0.1.0-beta.27

### Patch Changes

- b465413: Improvements to vercel deployments
- Updated dependencies [b465413]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.27
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.27
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.27
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.27
  - @jpmorganchase/mosaic-types@0.1.0-beta.27

## 0.1.0-beta.26

### Minor Changes

- 531c87a: ## Mosaic Theme

  The theme variables are now globally scoped and prefixed with `mosaic`.

  ## BrokenLinksPlugin

  The `BrokenLinksPlugin` uses a running instance of mosaic to verify that all links in the source pages are alive.

  If mosaic is running behind a corporate proxy, the `proxyEndpoint` option is required to fetch external URLs.

  Configuration:

  ```json
   {
        modulePath: '@jpmorganchase/mosaic-plugins/BrokenLinksPlugin',
        priority: -1,
        // Exclude this plugin in builds
        runTimeOnly: true,
        options: {
          baseUrl: process.env.MOSAIC_ACTIVE_MODE_URL || 'http://localhost:8080',
          proxyEndpoint: 'http://some-proxy-url'
        }
      }
  ```

  ## Next/Prev button

  The next and prev buttons are visible again on pages that have a layout that uses these buttons.

### Patch Changes

- Updated dependencies [531c87a]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.26
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.26
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.26
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.26
  - @jpmorganchase/mosaic-types@0.1.0-beta.26

## 0.1.0-beta.25

### Minor Changes

- 93e9b07: The theme contract provided by the `@jpmorganchase/mosaic-theme` package now uses locally scoped variable names via a Vanilla Extract [Theme Contract](https://vanilla-extract.style/documentation/api/create-theme-contract/). Previously the theme variables were globally scoped resulting in conflicts with other design systems.

### Patch Changes

- a36219c: - Next/Prev page buttons were not appearing at the bottom of a page sequence
  - Removed redundant snapshot page api
- Updated dependencies [a36219c]
- Updated dependencies [93e9b07]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.25
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.25
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.25
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.25
  - @jpmorganchase/mosaic-types@0.1.0-beta.25

## 0.1.0-beta.24

### Patch Changes

- 049d9af: 1. Pip Salt version 2. Issues 155, make 500 error more specific 3. button and sidebar styles 4. search opt-out
- Updated dependencies [049d9af]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.24
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.24
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.24
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.24
  - @jpmorganchase/mosaic-types@0.1.0-beta.24

## 0.1.0-beta.23

### Patch Changes

- 513d45f: Sidebar behavior and styling changes.
  Add Client-side search feature.
  Relax node engine requirements.
  Removal of patches from the site package.
  Update site generator templates.
- Updated dependencies [513d45f]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.23
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.23
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.23
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.23
  - @jpmorganchase/mosaic-types@0.1.0-beta.23

## 0.1.0-beta.22

### Patch Changes

- be89e4f: fix markdown tables and update generator's Salt patches

  - Salt patches in generator were out of sync with Mosaic repo
  - Markdown now support github flavoured markdown, such as Tables

- Updated dependencies [be89e4f]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.22
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.22
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.22
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.22
  - @jpmorganchase/mosaic-types@0.1.0-beta.22

## 0.1.0-beta.21

### Patch Changes

- f75fd5e: fix sidebar which was generated after `beforeSend` had completed
- Updated dependencies [f75fd5e]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.21
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.21
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.21
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.21
  - @jpmorganchase/mosaic-types@0.1.0-beta.21

## 0.1.0-beta.20

### Patch Changes

- 9c7b8ff: pip to beta.20
- Updated dependencies [9c7b8ff]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.20
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.20
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.20
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.20
  - @jpmorganchase/mosaic-types@0.1.0-beta.20

## 0.1.0-beta.19

### Patch Changes

- ad06d4c: ensure spinner is removed after page has loaded
- Updated dependencies [ad06d4c]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.19
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.19
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.19
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.19
  - @jpmorganchase/mosaic-types@0.1.0-beta.19

## 0.1.0-beta.18

### Patch Changes

- 066efed: Update docs with quick-start guide

  Sample docs now include a 'quick-start' guide to onboarding to AWS.

  Also

  - generator default directory is the current directory
  - after generating a site, it will run `yarn` in the created directory. This simplifies the generator call to just `yarn mosaic-create-site`

- Updated dependencies [066efed]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.18
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.18
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.18
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.18
  - @jpmorganchase/mosaic-types@0.1.0-beta.18

## 0.1.0-beta.17

### Patch Changes

- b2f6d52: Fix `pre` block code block rendering
- Updated dependencies [b2f6d52]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.17
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.17
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.17
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.17
  - @jpmorganchase/mosaic-types@0.1.0-beta.17

## 0.1.0-beta.16

### Patch Changes

- 3a5c88a: add missing `@types/node` dependency for generator
- Updated dependencies [3a5c88a]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.16
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.16
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.16
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.16
  - @jpmorganchase/mosaic-types@0.1.0-beta.16

## 0.1.0-beta.15

### Patch Changes

- aaaf255: initial release of HTTP Source package.

  An HTTP source accepts a collection of endpoints and a path to a transformer module.
  The response from fetching is transformed and merged together into 1 single collection of pages.
  Should 1 of the endpoints request fail then it will have no impact on the other requests.

- Updated dependencies [aaaf255]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.15
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.15
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.15
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.15
  - @jpmorganchase/mosaic-types@0.1.0-beta.15

## 0.1.0-beta.14

### Patch Changes

- dde3b5a: Feature release

  - Enhanced generators now have defaults.
    With one command (`yarn mosaic-create-site create`) it will generate a fully working site with both local and remote sources
  - Fix an issue where we could not clone from the master branch of git repos
  - Migrate to Next 13 image

- Updated dependencies [dde3b5a]
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.14
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.14
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.14
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.14
  - @jpmorganchase/mosaic-types@0.1.0-beta.14

## 0.1.0-beta.13

### Patch Changes

- d4da1df: incremental improvements

  - move colormode into store
  - ensure breadcrumbs and sidebar data is only added to frontmatter for pages which use a layout that has breadcrumbs or a sidebar
  - improve changeset so it can work standalone without a monorepo
  - resolev json5 vulnerability

- Updated dependencies [d4da1df]
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.13
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.13
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.13
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.13
  - @jpmorganchase/mosaic-types@0.1.0-beta.13

## 0.1.0-beta.12

### Patch Changes

- 9ec358b: Upgrade React to version 18 and NextJs to version 13
- Updated dependencies [9ec358b]
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.12
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.12
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.12
  - @jpmorganchase/mosaic-types@0.1.0-beta.12

## 0.1.0-beta.11

### Patch Changes

- 146a4bb: fix SSR Initial render

  removed Salt Core patch
  added Salt Labs patch (Cascading Menu) to support SSR

- fc5d7b5: Generators can now interactively add sources

  Previously we were making local edits to our own site or examples to implement new features.
  What we wanted was the ability to create a local rig, A local rig can be used for development purposes,
  without touching our site code.

  We have added Mosaic repo commands, to enable us to generates local rigs (`yarn gen:rig`) and deploy our own
  tech docs via snapshot (`yarn gen`)

  To generate a site+snapshot from sources defined in `mosaic-generators.js`, run `yarn gen`
  To generate a dynamic site from sources defined in `mosaic-generators.js`, run `yarn gen:site`
  To generate a rig `yarn gen:rig`

  Equally these changes can be used to generate sites in other repos via the `mosaic-create-site` command.

  `yarn mosaic-create-site init` will create a `mosaic.generators.js`.

  Configure the `mosaic.generators.js` with your generator and sources, then run.

  `yarn mosaic-create-site create -i -o path/to/my-site`

  When this command is run, it will present an interactive menu of generators and output the site to `path/to/my-site`.

- Updated dependencies [146a4bb]
- Updated dependencies [fc5d7b5]
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.11
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.11
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.11
  - @jpmorganchase/mosaic-types@0.1.0-beta.11

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
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.10
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.10
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.10
  - @jpmorganchase/mosaic-types@0.1.0-beta.10

## 0.1.0-beta.9

### Minor Changes

- c3fee89: initial components package

  - added JSDOM testing

### Patch Changes

- Updated dependencies [c3fee89]
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.9
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.9
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.9
  - @jpmorganchase/mosaic-types@0.1.0-beta.9

## 0.1.0-beta.8

### Minor Changes

- 2dca0b1: initial release of Mosaic store package

### Patch Changes

- Updated dependencies [2dca0b1]
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.8
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.8
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.8
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
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.7
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.7
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.7
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
