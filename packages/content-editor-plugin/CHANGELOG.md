# @jpmorganchase/mosaic-content-editor-plugin

## 0.1.0-beta.92

### Patch Changes

- c5b7a75c: Pip Salt and re-align to Salt theme

  Mosaic was initially developed as an internal documentation tool when the Salt Design System lacked several components necessary for building a comprehensive documentation site. Currently, Salt utilizes Mosaic for its documentation, but there are redundancies in themes and components, along with inconsistencies in design standards.

  In this release, we are beginning the process of phasing out the Mosaic theme and eliminating duplicated components, opting instead to use Salt's components directly. This update includes the latest Salt dependencies and initiates the replacement of Mosaic components with their Salt counterparts. Additionally, we are removing the Mosaic-specific theme, aiming to make the site customizable through the Salt theme in the future.

  Key Changes:

  Markdown headings and code styles are now sourced from Salt.
  The Prism code highlighter has been replaced with Shiki.
  The Tile component has been refactored to utilize Salt's Card-based solution.
  The TileLink component has been refactored.
  The Card component has been swapped for Salt's Card.
  This update is largely non-breaking. However, changes are required in the documentation for Tiles and Cards, which now utilize Salt's Grid layout. This necessitates defining columns and rows:

  ```diff
  - <Tiles>
  - </Tiles>
  + <Tiles columns={4} rows={1}>
  + <Tiles>
  ```

  If your documentation includes these components, updating the values will resolve any sizing issues. Otherwise, they will default to 12 columns, which may be too narrow.

- Updated dependencies [c5b7a75c]
  - @jpmorganchase/mosaic-components@0.1.0-beta.92
  - @jpmorganchase/mosaic-theme@0.1.0-beta.92

## 0.1.0-beta.91

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.91
- @jpmorganchase/mosaic-theme@0.1.0-beta.91

## 0.1.0-beta.90

### Patch Changes

- e2821e10: - Fixed LinkEditor not working when editing existing links.
  - Fixed InsertBlockDropdown not updating correctly.
  - @jpmorganchase/mosaic-components@0.1.0-beta.90
  - @jpmorganchase/mosaic-theme@0.1.0-beta.90

## 0.1.0-beta.89

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.89
- @jpmorganchase/mosaic-theme@0.1.0-beta.89

## 0.1.0-beta.88

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.88
- @jpmorganchase/mosaic-theme@0.1.0-beta.88

## 0.1.0-beta.87

### Patch Changes

- Updated dependencies [dca2d049]
  - @jpmorganchase/mosaic-theme@0.1.0-beta.87
  - @jpmorganchase/mosaic-components@0.1.0-beta.87

## 0.1.0-beta.86

### Patch Changes

- bb1189a1: Fixed link style CSS is generated against both light and dark modes. Fixed #640.
- Updated dependencies [bb1189a1]
  - @jpmorganchase/mosaic-theme@0.1.0-beta.86
  - @jpmorganchase/mosaic-components@0.1.0-beta.86

## 0.1.0-beta.85

### Patch Changes

- Updated dependencies [e6104310]
  - @jpmorganchase/mosaic-theme@0.1.0-beta.85
  - @jpmorganchase/mosaic-components@0.1.0-beta.85

## 0.1.0-beta.84

### Patch Changes

- Updated dependencies [49cbe9fd]
  - @jpmorganchase/mosaic-components@0.1.0-beta.84
  - @jpmorganchase/mosaic-theme@0.1.0-beta.84

## 0.1.0-beta.83

### Patch Changes

- 8e96ed0c: Updated Salt packages.
- Updated dependencies [24551c8d]
- Updated dependencies [8e96ed0c]
  - @jpmorganchase/mosaic-components@0.1.0-beta.83
  - @jpmorganchase/mosaic-theme@0.1.0-beta.83

## 0.1.0-beta.82

### Patch Changes

- Updated dependencies [fb689099]
  - @jpmorganchase/mosaic-components@0.1.0-beta.82
  - @jpmorganchase/mosaic-theme@0.1.0-beta.82

## 0.1.0-beta.81

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.81
- @jpmorganchase/mosaic-theme@0.1.0-beta.81

## 0.1.0-beta.80

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.80
- @jpmorganchase/mosaic-theme@0.1.0-beta.80

## 0.1.0-beta.79

### Patch Changes

- Updated dependencies [244ed5c3]
  - @jpmorganchase/mosaic-components@0.1.0-beta.79
  - @jpmorganchase/mosaic-theme@0.1.0-beta.79

## 0.1.0-beta.78

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.78
- @jpmorganchase/mosaic-theme@0.1.0-beta.78

## 0.1.0-beta.77

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.77
- @jpmorganchase/mosaic-theme@0.1.0-beta.77

## 0.1.0-beta.76

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.76
- @jpmorganchase/mosaic-theme@0.1.0-beta.76

## 0.1.0-beta.75

### Patch Changes

- Updated dependencies [ffc03a18]
- Updated dependencies [fd6d715d]
  - @jpmorganchase/mosaic-components@0.1.0-beta.75
  - @jpmorganchase/mosaic-theme@0.1.0-beta.75

## 0.1.0-beta.74

### Patch Changes

- 2d4e5616: Pipped Salt DS to @salt-ds/core 1.26.0
- Updated dependencies [2d4e5616]
  - @jpmorganchase/mosaic-components@0.1.0-beta.74
  - @jpmorganchase/mosaic-theme@0.1.0-beta.74

## 0.1.0-beta.73

### Patch Changes

- de00c017: Added the files package.json field to all of the packages to prevent unnecessary files being published.
- Updated dependencies [de00c017]
  - @jpmorganchase/mosaic-components@0.1.0-beta.73
  - @jpmorganchase/mosaic-theme@0.1.0-beta.73

## 0.1.0-beta.72

### Patch Changes

- e5d14ab4: Upgraded Salt packages to:

  @salt-ds/core@1.22.0
  @salt-ds/lab@1.0.0-alpha.38
  @salt-ds/theme@1.13.1

- Updated dependencies [e5d14ab4]
  - @jpmorganchase/mosaic-components@0.1.0-beta.72
  - @jpmorganchase/mosaic-theme@0.1.0-beta.72

## 0.1.0-beta.71

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.71
- @jpmorganchase/mosaic-theme@0.1.0-beta.71

## 0.1.0-beta.70

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.70
- @jpmorganchase/mosaic-theme@0.1.0-beta.70

## 0.1.0-beta.69

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.69
- @jpmorganchase/mosaic-theme@0.1.0-beta.69

## 0.1.0-beta.68

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.68
- @jpmorganchase/mosaic-theme@0.1.0-beta.68

## 0.1.0-beta.67

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.67
- @jpmorganchase/mosaic-theme@0.1.0-beta.67

## 0.1.0-beta.66

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.66
- @jpmorganchase/mosaic-theme@0.1.0-beta.66

## 0.1.0-beta.65

### Patch Changes

- abe4f6c8: Fix: Content Editor Websocket

  Reduce the risk of the websocket connection from closing due to editing/reviewing for a long period.

  The websocket connection is now established when the _save_ button is clicked rather than the _edit_ button.

  - @jpmorganchase/mosaic-components@0.1.0-beta.65
  - @jpmorganchase/mosaic-theme@0.1.0-beta.65

## 0.1.0-beta.64

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.64
- @jpmorganchase/mosaic-theme@0.1.0-beta.64

## 0.1.0-beta.63

### Patch Changes

- Updated dependencies [680eb0eb]
  - @jpmorganchase/mosaic-components@0.1.0-beta.63
  - @jpmorganchase/mosaic-theme@0.1.0-beta.63

## 0.1.0-beta.62

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.62
- @jpmorganchase/mosaic-theme@0.1.0-beta.62

## 0.1.0-beta.61

### Patch Changes

- cec89401: add `pluginTimeout` (20 secs) to fastify to prevent loading timeout
- Updated dependencies [cec89401]
  - @jpmorganchase/mosaic-components@0.1.0-beta.61
  - @jpmorganchase/mosaic-theme@0.1.0-beta.61

## 0.1.0-beta.60

### Patch Changes

- a3da0830: New Readme Source

  This source pulls a single Readme.md from a remote Source repo.
  Typically used for third-party repos which exist already or don't want to
  create a full document hierachy and use `@jpmorganchase/mosaic-source-git-repo`.
  By pulling a single page, we can add metadata to that page via the source's config.
  It's also more performant as we do not need to pull a whole source repo.

- Updated dependencies [a3da0830]
  - @jpmorganchase/mosaic-components@0.1.0-beta.60
  - @jpmorganchase/mosaic-theme@0.1.0-beta.60

## 0.1.0-beta.59

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.59
- @jpmorganchase/mosaic-theme@0.1.0-beta.59

## 0.1.0-beta.58

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.58
- @jpmorganchase/mosaic-theme@0.1.0-beta.58

## 0.1.0-beta.57

### Patch Changes

- d214d112: Add catch-all default exports for

  - `@jpmorganchase/mosaic-store`
  - `@jpmorganchase/mosaic-theme`
  - `@jpmorganchase/mosaic-workflows`

  This resolves an issue when running tests from an external repo which depends on these packages

- Updated dependencies [d214d112]
  - @jpmorganchase/mosaic-theme@0.1.0-beta.57
  - @jpmorganchase/mosaic-components@0.1.0-beta.57

## 0.1.0-beta.56

### Patch Changes

- 6d30e29f: Add new Storybook source

  Storybook stories can be extracted from Storybook and embedded into Mosaic pages.

  The stories are extracted based on a configured filter or matching tags.

  With a page created for each Story, the author can create a dynamic index of matching stories.

  eg. An index of patterns which match a specific tag

- Updated dependencies [6d30e29f]
  - @jpmorganchase/mosaic-components@0.1.0-beta.56
  - @jpmorganchase/mosaic-theme@0.1.0-beta.56

## 0.1.0-beta.55

### Minor Changes

- 3dd27378: Upgraded Salt packages to:

  @salt-ds/core@1.11.0
  @salt-ds/lab@1.0.0-alpha.20
  @salt-ds/icons@1.7.0
  @salt-ds/theme@1.9.0

### Patch Changes

- Updated dependencies [3dd27378]
  - @jpmorganchase/mosaic-components@0.1.0-beta.55
  - @jpmorganchase/mosaic-theme@0.1.0-beta.55

## 0.1.0-beta.54

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.54
- @jpmorganchase/mosaic-theme@0.1.0-beta.54

## 0.1.0-beta.53

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.53
- @jpmorganchase/mosaic-theme@0.1.0-beta.53

## 0.1.0-beta.52

### Patch Changes

- 9ad7418c: Use a websocket for workflows
  - @jpmorganchase/mosaic-components@0.1.0-beta.52
  - @jpmorganchase/mosaic-theme@0.1.0-beta.52

## 0.1.0-beta.51

### Patch Changes

- Updated dependencies [56bbad4b]
  - @jpmorganchase/mosaic-components@0.1.0-beta.51
  - @jpmorganchase/mosaic-theme@0.1.0-beta.51

## 0.1.0-beta.50

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.50
- @jpmorganchase/mosaic-theme@0.1.0-beta.50

## 0.1.0-beta.49

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.49
- @jpmorganchase/mosaic-theme@0.1.0-beta.49

## 0.1.0-beta.48

### Patch Changes

- eb085d3d: ### Fix

  The insert/edit link dialog no longer closes when its contents are clicked.

  ### Refactor

  The forms used to insert/edit links and insert images in the content editor plugin have been updated to use the latest version of `FormField` and `Input` from Salt-ds.

  - @jpmorganchase/mosaic-components@0.1.0-beta.48
  - @jpmorganchase/mosaic-theme@0.1.0-beta.48

## 0.1.0-beta.47

### Patch Changes

- Updated dependencies [5abe7fdf]
- Updated dependencies [19b4e49a]
  - @jpmorganchase/mosaic-components@0.1.0-beta.47
  - @jpmorganchase/mosaic-theme@0.1.0-beta.47

## 0.1.0-beta.46

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.46
- @jpmorganchase/mosaic-theme@0.1.0-beta.46

## 0.1.0-beta.45

### Patch Changes

- Updated dependencies [020ae58d]
  - @jpmorganchase/mosaic-components@0.1.0-beta.45
  - @jpmorganchase/mosaic-theme@0.1.0-beta.45

## 0.1.0-beta.44

### Patch Changes

- Updated dependencies [cc5183e]
- Updated dependencies [36896ac]
  - @jpmorganchase/mosaic-components@0.1.0-beta.44
  - @jpmorganchase/mosaic-theme@0.1.0-beta.44

## 0.1.0-beta.43

### Patch Changes

- Updated dependencies [0dc621d]
- Updated dependencies [4e69178]
  - @jpmorganchase/mosaic-components@0.1.0-beta.43
  - @jpmorganchase/mosaic-theme@0.1.0-beta.43

## 0.1.0-beta.42

### Patch Changes

- Updated dependencies [3491f29]
  - @jpmorganchase/mosaic-components@0.1.0-beta.42
  - @jpmorganchase/mosaic-theme@0.1.0-beta.42

## 0.1.0-beta.41

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.41
- @jpmorganchase/mosaic-theme@0.1.0-beta.41

## 0.1.0-beta.40

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.40
- @jpmorganchase/mosaic-theme@0.1.0-beta.40

## 0.1.0-beta.39

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.39
- @jpmorganchase/mosaic-theme@0.1.0-beta.39

## 0.1.0-beta.38

### Patch Changes

- dc993df: Styling and API changes for In-Browser Content Editor (IBCE)
- Updated dependencies [18f7a0b]
  - @jpmorganchase/mosaic-theme@0.1.0-beta.38
  - @jpmorganchase/mosaic-components@0.1.0-beta.38

## 0.1.0-beta.37

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.37
- @jpmorganchase/mosaic-theme@0.1.0-beta.37

## 0.1.0-beta.36

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.36
- @jpmorganchase/mosaic-theme@0.1.0-beta.36

## 0.1.0-beta.35

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.35
- @jpmorganchase/mosaic-theme@0.1.0-beta.35

## 0.1.0-beta.34

### Patch Changes

- 3d117d3: Upgrade to latest Salt libraries
- Updated dependencies [3d117d3]
  - @jpmorganchase/mosaic-components@0.1.0-beta.34
  - @jpmorganchase/mosaic-theme@0.1.0-beta.34

## 0.1.0-beta.33

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.33
- @jpmorganchase/mosaic-theme@0.1.0-beta.33

## 0.1.0-beta.32

### Patch Changes

- 6265b19: Upgrade to latest Salt libraries
- Updated dependencies [6265b19]
  - @jpmorganchase/mosaic-components@0.1.0-beta.32
  - @jpmorganchase/mosaic-theme@0.1.0-beta.32

## 0.1.0-beta.31

### Patch Changes

- b609fd0: Added support for containerization of the site and cli as well as providing config for kubernetes development (skaffold)

  ## @jpmorganchase/mosaic-cli

  The cli package has been updated to support containerization.

- Updated dependencies [b609fd0]
- Updated dependencies [d04fb1e]
  - @jpmorganchase/mosaic-components@0.1.0-beta.31
  - @jpmorganchase/mosaic-theme@0.1.0-beta.31

## 0.1.0-beta.30

### Patch Changes

- 18ef436: The git repo source no longer generates a double slash between the repo host and repo path.
- Updated dependencies [18ef436]
  - @jpmorganchase/mosaic-components@0.1.0-beta.30
  - @jpmorganchase/mosaic-theme@0.1.0-beta.30

## 0.1.0-beta.29

### Minor Changes

- c78deb4: Flatten Sidebar
  Search Optimisation
  Public Assets Plugin
  TOC Indentation

### Patch Changes

- Updated dependencies [c78deb4]
  - @jpmorganchase/mosaic-components@0.1.0-beta.29
  - @jpmorganchase/mosaic-theme@0.1.0-beta.29

## 0.1.0-beta.28

### Patch Changes

- 27ac914: 1. Layout improvements. 2. Fix: if a user hits a url that lands on a directory, the index file within that directory is resolved as the content. 3. Fix: improve Table of Contents component highlighting.
- Updated dependencies [27ac914]
  - @jpmorganchase/mosaic-components@0.1.0-beta.28
  - @jpmorganchase/mosaic-theme@0.1.0-beta.28

## 0.1.0-beta.27

### Patch Changes

- 0a672d4: Pin @salt-ds/lab to 1.0.0-alpha.1
- b465413: Improvements to vercel deployments
- Updated dependencies [0a672d4]
- Updated dependencies [b465413]
  - @jpmorganchase/mosaic-components@0.1.0-beta.27
  - @jpmorganchase/mosaic-theme@0.1.0-beta.27

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
  - @jpmorganchase/mosaic-theme@0.1.0-beta.26
  - @jpmorganchase/mosaic-components@0.1.0-beta.26

## 0.1.0-beta.25

### Minor Changes

- 93e9b07: The theme contract provided by the `@jpmorganchase/mosaic-theme` package now uses locally scoped variable names via a Vanilla Extract [Theme Contract](https://vanilla-extract.style/documentation/api/create-theme-contract/). Previously the theme variables were globally scoped resulting in conflicts with other design systems.

### Patch Changes

- a36219c: - Next/Prev page buttons were not appearing at the bottom of a page sequence
  - Removed redundant snapshot page api
- Updated dependencies [a36219c]
- Updated dependencies [93e9b07]
  - @jpmorganchase/mosaic-components@0.1.0-beta.25
  - @jpmorganchase/mosaic-theme@0.1.0-beta.25

## 0.1.0-beta.24

### Patch Changes

- 049d9af: 1. Pip Salt version 2. Issues 155, make 500 error more specific 3. button and sidebar styles 4. search opt-out
- Updated dependencies [049d9af]
  - @jpmorganchase/mosaic-components@0.1.0-beta.24
  - @jpmorganchase/mosaic-theme@0.1.0-beta.24

## 0.1.0-beta.23

### Patch Changes

- 513d45f: Sidebar behavior and styling changes.
  Add Client-side search feature.
  Relax node engine requirements.
  Removal of patches from the site package.
  Update site generator templates.
- Updated dependencies [513d45f]
  - @jpmorganchase/mosaic-components@0.1.0-beta.23
  - @jpmorganchase/mosaic-theme@0.1.0-beta.23

## 0.1.0-beta.22

### Patch Changes

- be89e4f: fix markdown tables and update generator's Salt patches

  - Salt patches in generator were out of sync with Mosaic repo
  - Markdown now support github flavoured markdown, such as Tables

- Updated dependencies [be89e4f]
  - @jpmorganchase/mosaic-components@0.1.0-beta.22
  - @jpmorganchase/mosaic-theme@0.1.0-beta.22

## 0.1.0-beta.21

### Patch Changes

- f75fd5e: fix sidebar which was generated after `beforeSend` had completed
- Updated dependencies [f75fd5e]
  - @jpmorganchase/mosaic-components@0.1.0-beta.21
  - @jpmorganchase/mosaic-theme@0.1.0-beta.21

## 0.1.0-beta.20

### Patch Changes

- 9c7b8ff: pip to beta.20
- Updated dependencies [9c7b8ff]
  - @jpmorganchase/mosaic-components@0.1.0-beta.20
  - @jpmorganchase/mosaic-theme@0.1.0-beta.20

## 0.1.0-beta.19

### Patch Changes

- ad06d4c: ensure spinner is removed after page has loaded
- Updated dependencies [ad06d4c]
  - @jpmorganchase/mosaic-components@0.1.0-beta.19
  - @jpmorganchase/mosaic-theme@0.1.0-beta.19

## 0.1.0-beta.18

### Patch Changes

- 066efed: Update docs with quick-start guide

  Sample docs now include a 'quick-start' guide to onboarding to AWS.

  Also

  - generator default directory is the current directory
  - after generating a site, it will run `yarn` in the created directory. This simplifies the generator call to just `yarn mosaic-create-site`

- Updated dependencies [066efed]
  - @jpmorganchase/mosaic-components@0.1.0-beta.18
  - @jpmorganchase/mosaic-theme@0.1.0-beta.18

## 0.1.0-beta.17

### Patch Changes

- b2f6d52: Fix `pre` block code block rendering
- Updated dependencies [b2f6d52]
  - @jpmorganchase/mosaic-components@0.1.0-beta.17
  - @jpmorganchase/mosaic-theme@0.1.0-beta.17

## 0.1.0-beta.16

### Patch Changes

- 3a5c88a: add missing `@types/node` dependency for generator
- Updated dependencies [3a5c88a]
  - @jpmorganchase/mosaic-components@0.1.0-beta.16
  - @jpmorganchase/mosaic-theme@0.1.0-beta.16

## 0.1.0-beta.15

### Patch Changes

- aaaf255: initial release of HTTP Source package.

  An HTTP source accepts a collection of endpoints and a path to a transformer module.
  The response from fetching is transformed and merged together into 1 single collection of pages.
  Should 1 of the endpoints request fail then it will have no impact on the other requests.

- Updated dependencies [aaaf255]
  - @jpmorganchase/mosaic-components@0.1.0-beta.15
  - @jpmorganchase/mosaic-theme@0.1.0-beta.15

## 0.1.0-beta.14

### Patch Changes

- dde3b5a: Feature release

  - Enhanced generators now have defaults.
    With one command (`yarn mosaic-create-site create`) it will generate a fully working site with both local and remote sources
  - Fix an issue where we could not clone from the master branch of git repos
  - Migrate to Next 13 image

- Updated dependencies [dde3b5a]
  - @jpmorganchase/mosaic-components@0.1.0-beta.14
  - @jpmorganchase/mosaic-theme@0.1.0-beta.14

## 0.1.0-beta.13

### Patch Changes

- d4da1df: incremental improvements

  - move colormode into store
  - ensure breadcrumbs and sidebar data is only added to frontmatter for pages which use a layout that has breadcrumbs or a sidebar
  - improve changeset so it can work standalone without a monorepo
  - resolev json5 vulnerability

- Updated dependencies [d4da1df]
  - @jpmorganchase/mosaic-components@0.1.0-beta.13
  - @jpmorganchase/mosaic-theme@0.1.0-beta.13

## 0.1.0-beta.12

### Patch Changes

- 9ec358b: Upgrade React to version 18 and NextJs to version 13
- 3eb35bf: initial work to enable generators to run outside of the repo
- Updated dependencies [9ec358b]
- Updated dependencies [3eb35bf]
  - @jpmorganchase/mosaic-components@0.1.0-beta.12
  - @jpmorganchase/mosaic-theme@0.1.0-beta.12

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
  - @jpmorganchase/mosaic-components@0.1.0-beta.11
  - @jpmorganchase/mosaic-theme@0.1.0-beta.11

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
  - @jpmorganchase/mosaic-theme@0.1.0-beta.10
