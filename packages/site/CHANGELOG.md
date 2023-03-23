# @jpmorganchase/mosaic-site

## 0.1.0-beta.26

### Patch Changes

- b465413: Improvements to vercel deployments
- Updated dependencies [0a672d4]
- Updated dependencies [b465413]
  - @jpmorganchase/mosaic-components@0.1.0-beta.27
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.27
  - @jpmorganchase/mosaic-layouts@0.1.0-beta.27
  - @jpmorganchase/mosaic-site-components@0.1.0-beta.27
  - @jpmorganchase/mosaic-cli@0.1.0-beta.27
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.27
  - @jpmorganchase/mosaic-site-preset-styles@0.1.0-beta.27
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.27
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.27
  - @jpmorganchase/mosaic-store@0.1.0-beta.27
  - @jpmorganchase/mosaic-theme@0.1.0-beta.27

## 0.1.0-beta.25

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
  - @jpmorganchase/mosaic-theme@0.1.0-beta.26
  - @jpmorganchase/mosaic-cli@0.1.0-beta.26
  - @jpmorganchase/mosaic-components@0.1.0-beta.26
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.26
  - @jpmorganchase/mosaic-layouts@0.1.0-beta.26
  - @jpmorganchase/mosaic-site-components@0.1.0-beta.26
  - @jpmorganchase/mosaic-site-preset-styles@0.1.0-beta.26
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.26
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.26
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.26
  - @jpmorganchase/mosaic-store@0.1.0-beta.26

## 0.1.0-beta.24

### Minor Changes

- 93e9b07: The theme contract provided by the `@jpmorganchase/mosaic-theme` package now uses locally scoped variable names via a Vanilla Extract [Theme Contract](https://vanilla-extract.style/documentation/api/create-theme-contract/). Previously the theme variables were globally scoped resulting in conflicts with other design systems.

### Patch Changes

- a36219c: - Next/Prev page buttons were not appearing at the bottom of a page sequence
  - Removed redundant snapshot page api
- Updated dependencies [a36219c]
- Updated dependencies [93e9b07]
  - @jpmorganchase/mosaic-site-components@0.1.0-beta.25
  - @jpmorganchase/mosaic-store@0.1.0-beta.25
  - @jpmorganchase/mosaic-cli@0.1.0-beta.25
  - @jpmorganchase/mosaic-components@0.1.0-beta.25
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.25
  - @jpmorganchase/mosaic-layouts@0.1.0-beta.25
  - @jpmorganchase/mosaic-site-preset-styles@0.1.0-beta.25
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.25
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.25
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.25
  - @jpmorganchase/mosaic-theme@0.1.0-beta.25

## 0.1.0-beta.23

### Patch Changes

- 049d9af: 1. Pip Salt version 2. Issues 155, make 500 error more specific 3. button and sidebar styles 4. search opt-out
- Updated dependencies [049d9af]
  - @jpmorganchase/mosaic-cli@0.1.0-beta.24
  - @jpmorganchase/mosaic-components@0.1.0-beta.24
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.24
  - @jpmorganchase/mosaic-layouts@0.1.0-beta.24
  - @jpmorganchase/mosaic-site-components@0.1.0-beta.24
  - @jpmorganchase/mosaic-site-preset-styles@0.1.0-beta.24
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.24
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.24
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.24
  - @jpmorganchase/mosaic-store@0.1.0-beta.24
  - @jpmorganchase/mosaic-theme@0.1.0-beta.24

## 0.1.0-beta.22

### Patch Changes

- 513d45f: Sidebar behavior and styling changes.
  Add Client-side search feature.
  Relax node engine requirements.
  Removal of patches from the site package.
  Update site generator templates.
- Updated dependencies [513d45f]
  - @jpmorganchase/mosaic-cli@0.1.0-beta.23
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.23
  - @jpmorganchase/mosaic-components@0.1.0-beta.23
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.23
  - @jpmorganchase/mosaic-layouts@0.1.0-beta.23
  - @jpmorganchase/mosaic-site-components@0.1.0-beta.23
  - @jpmorganchase/mosaic-site-preset-styles@0.1.0-beta.23
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.23
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.23
  - @jpmorganchase/mosaic-store@0.1.0-beta.23
  - @jpmorganchase/mosaic-theme@0.1.0-beta.23

## 0.1.0-beta.21

### Patch Changes

- be89e4f: fix markdown tables and update generator's Salt patches

  - Salt patches in generator were out of sync with Mosaic repo
  - Markdown now support github flavoured markdown, such as Tables

- Updated dependencies [be89e4f]
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.22
  - @jpmorganchase/mosaic-cli@0.1.0-beta.22
  - @jpmorganchase/mosaic-components@0.1.0-beta.22
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.22
  - @jpmorganchase/mosaic-core@0.1.0-beta.22
  - @jpmorganchase/mosaic-layouts@0.1.0-beta.22
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.22
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.22
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.22
  - @jpmorganchase/mosaic-site-components@0.1.0-beta.22
  - @jpmorganchase/mosaic-site-preset-styles@0.1.0-beta.22
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.22
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.22
  - @jpmorganchase/mosaic-store@0.1.0-beta.22
  - @jpmorganchase/mosaic-theme@0.1.0-beta.22
  - @jpmorganchase/mosaic-types@0.1.0-beta.22

## 0.1.0-beta.20

### Patch Changes

- f75fd5e: fix sidebar which was generated after `beforeSend` had completed
- Updated dependencies [f75fd5e]
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.21
  - @jpmorganchase/mosaic-cli@0.1.0-beta.21
  - @jpmorganchase/mosaic-components@0.1.0-beta.21
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.21
  - @jpmorganchase/mosaic-core@0.1.0-beta.21
  - @jpmorganchase/mosaic-layouts@0.1.0-beta.21
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.21
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.21
  - @jpmorganchase/mosaic-site-components@0.1.0-beta.21
  - @jpmorganchase/mosaic-site-preset-styles@0.1.0-beta.21
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.21
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.21
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.21
  - @jpmorganchase/mosaic-store@0.1.0-beta.21
  - @jpmorganchase/mosaic-theme@0.1.0-beta.21
  - @jpmorganchase/mosaic-types@0.1.0-beta.21

## 0.1.0-beta.19

### Patch Changes

- 9c7b8ff: pip to beta.20
- Updated dependencies [9c7b8ff]
  - @jpmorganchase/mosaic-cli@0.1.0-beta.20
  - @jpmorganchase/mosaic-components@0.1.0-beta.20
  - @jpmorganchase/mosaic-content-editor-plugin@0.1.0-beta.20
  - @jpmorganchase/mosaic-core@0.1.0-beta.20
  - @jpmorganchase/mosaic-layouts@0.1.0-beta.20
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.20
  - @jpmorganchase/mosaic-schemas@0.1.0-beta.20
  - @jpmorganchase/mosaic-serialisers@0.1.0-beta.20
  - @jpmorganchase/mosaic-site-components@0.1.0-beta.20
  - @jpmorganchase/mosaic-site-preset-styles@0.1.0-beta.20
  - @jpmorganchase/mosaic-source-git-repo@0.1.0-beta.20
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.20
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.20
  - @jpmorganchase/mosaic-store@0.1.0-beta.20
  - @jpmorganchase/mosaic-theme@0.1.0-beta.20
  - @jpmorganchase/mosaic-types@0.1.0-beta.20
