# @jpmorganchase/mosaic-cli

## 0.1.0-beta.39

### Patch Changes

- Updated dependencies [d2ff626]
- Updated dependencies [2b3948d]
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.39
  - @jpmorganchase/mosaic-core@0.1.0-beta.39
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.39
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.39

## 0.1.0-beta.38

### Patch Changes

- Updated dependencies [dc993df]
  - @jpmorganchase/mosaic-core@0.1.0-beta.38
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.38
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.38
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.38

## 0.1.0-beta.37

### Patch Changes

- Updated dependencies [feb5b9e]
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.37
  - @jpmorganchase/mosaic-core@0.1.0-beta.37
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.37
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.37

## 0.1.0-beta.36

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.36
- @jpmorganchase/mosaic-plugins@0.1.0-beta.36
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.36
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.36

## 0.1.0-beta.35

### Patch Changes

- Updated dependencies [00a9408]
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.35
  - @jpmorganchase/mosaic-core@0.1.0-beta.35
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.35
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.35

## 0.1.0-beta.34

### Patch Changes

- @jpmorganchase/mosaic-core@0.1.0-beta.34
- @jpmorganchase/mosaic-plugins@0.1.0-beta.34
- @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.34
- @jpmorganchase/mosaic-standard-generator@0.1.0-beta.34

## 0.1.0-beta.33

### Patch Changes

- Updated dependencies [cb18c31]
- Updated dependencies [e6d9594]
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.33
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.33
  - @jpmorganchase/mosaic-core@0.1.0-beta.33
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.33

## 0.1.0-beta.32

### Patch Changes

- a56eadb: ## Source Pushing

  The Mosaic CLI provides an endpoint `/sources/add/` that allows a new source to be pushed to a running instance of Mosaic.

  To do this you make a POST request with a JSON body composed of

  - a `name` property
  - a `definition` property

  ### Example request body

  Pushing a new git repo source:

  ```
  {
      "name":"my-docs-preview",
      "definition": {
        "modulePath": "@jpmorganchase/mosaic-source-git-repo",
        "namespace": "my-docs",
        "options": {
          "credentials":<access-token>,
          "prefixDir": "my-docs",
          "cache": true,
          "subfolder": "docs",
          "repo": <repo-url>,
          "branch": "main",
          "extensions": [".mdx"],
          "remote": "origin"
        }
      }
  }
  ```

  ## Notes

  By default, these sources are marked as a "preview" which means `preview-` is appended to the source namespace and certain plugins will not be run on this source e.g. search and sitemap plugins.

  You can disabled this behavior in 2 ways:

  1. send the property `isPreview` with the value of false as part of the POST request body
  2. modify plugin definitions in the mosaic config file to set `previewDisabled` to be false for all plugins you wish have run on this source.

- Updated dependencies [a56eadb]
- Updated dependencies [7ed1ee7]
- Updated dependencies [8c854fd]
  - @jpmorganchase/mosaic-core@0.1.0-beta.32
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.32
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.32
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.32

## 0.1.0-beta.31

### Patch Changes

- b609fd0: Added support for containerization of the site and cli as well as providing config for kubernetes development (skaffold)

  ## @jpmorganchase/mosaic-cli

  The cli package has been updated to support containerization.

- Updated dependencies [b609fd0]
- Updated dependencies [0f702ad]
  - @jpmorganchase/mosaic-core@0.1.0-beta.31
  - @jpmorganchase/mosaic-plugins@0.1.0-beta.31
  - @jpmorganchase/mosaic-source-local-folder@0.1.0-beta.31
  - @jpmorganchase/mosaic-standard-generator@0.1.0-beta.31

## 0.1.0-beta.30

### Patch Changes

- 18ef436: The git repo source no longer generates a double slash between the repo host and repo path.
- Updated dependencies [18ef436]
  - @jpmorganchase/mosaic-core@0.1.0-beta.30

## 0.1.0-beta.29

### Minor Changes

- c78deb4: Flatten Sidebar
  Search Optimisation
  Public Assets Plugin
  TOC Indentation

### Patch Changes

- Updated dependencies [c78deb4]
  - @jpmorganchase/mosaic-core@0.1.0-beta.29

## 0.1.0-beta.28

### Patch Changes

- 27ac914: 1. Layout improvements. 2. Fix: if a user hits a url that lands on a directory, the index file within that directory is resolved as the content. 3. Fix: improve Table of Contents component highlighting.
- Updated dependencies [27ac914]
  - @jpmorganchase/mosaic-core@0.1.0-beta.28

## 0.1.0-beta.27

### Patch Changes

- b465413: Improvements to vercel deployments
- Updated dependencies [b465413]
  - @jpmorganchase/mosaic-core@0.1.0-beta.27

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
  - @jpmorganchase/mosaic-core@0.1.0-beta.26

## 0.1.0-beta.25

### Minor Changes

- 93e9b07: The theme contract provided by the `@jpmorganchase/mosaic-theme` package now uses locally scoped variable names via a Vanilla Extract [Theme Contract](https://vanilla-extract.style/documentation/api/create-theme-contract/). Previously the theme variables were globally scoped resulting in conflicts with other design systems.

### Patch Changes

- a36219c: - Next/Prev page buttons were not appearing at the bottom of a page sequence
  - Removed redundant snapshot page api
- Updated dependencies [a36219c]
- Updated dependencies [93e9b07]
  - @jpmorganchase/mosaic-core@0.1.0-beta.25

## 0.1.0-beta.24

### Patch Changes

- 049d9af: 1. Pip Salt version 2. Issues 155, make 500 error more specific 3. button and sidebar styles 4. search opt-out
- Updated dependencies [049d9af]
  - @jpmorganchase/mosaic-core@0.1.0-beta.24

## 0.1.0-beta.23

### Patch Changes

- 513d45f: Sidebar behavior and styling changes.
  Add Client-side search feature.
  Relax node engine requirements.
  Removal of patches from the site package.
  Update site generator templates.
- Updated dependencies [513d45f]
  - @jpmorganchase/mosaic-core@0.1.0-beta.23

## 0.1.0-beta.22

### Patch Changes

- be89e4f: fix markdown tables and update generator's Salt patches

  - Salt patches in generator were out of sync with Mosaic repo
  - Markdown now support github flavoured markdown, such as Tables

- Updated dependencies [be89e4f]
  - @jpmorganchase/mosaic-core@0.1.0-beta.22

## 0.1.0-beta.21

### Patch Changes

- f75fd5e: fix sidebar which was generated after `beforeSend` had completed
- Updated dependencies [f75fd5e]
  - @jpmorganchase/mosaic-core@0.1.0-beta.21

## 0.1.0-beta.20

### Patch Changes

- 9c7b8ff: pip to beta.20
- Updated dependencies [9c7b8ff]
  - @jpmorganchase/mosaic-core@0.1.0-beta.20

## 0.1.0-beta.19

### Patch Changes

- ad06d4c: ensure spinner is removed after page has loaded
- Updated dependencies [ad06d4c]
  - @jpmorganchase/mosaic-core@0.1.0-beta.19

## 0.1.0-beta.18

### Patch Changes

- 066efed: Update docs with quick-start guide

  Sample docs now include a 'quick-start' guide to onboarding to AWS.

  Also

  - generator default directory is the current directory
  - after generating a site, it will run `yarn` in the created directory. This simplifies the generator call to just `yarn mosaic-create-site`

- Updated dependencies [066efed]
  - @jpmorganchase/mosaic-core@0.1.0-beta.18

## 0.1.0-beta.17

### Patch Changes

- b2f6d52: Fix `pre` block code block rendering
- Updated dependencies [b2f6d52]
  - @jpmorganchase/mosaic-core@0.1.0-beta.17

## 0.1.0-beta.16

### Patch Changes

- 3a5c88a: add missing `@types/node` dependency for generator
- Updated dependencies [3a5c88a]
  - @jpmorganchase/mosaic-core@0.1.0-beta.16

## 0.1.0-beta.15

### Patch Changes

- aaaf255: initial release of HTTP Source package.

  An HTTP source accepts a collection of endpoints and a path to a transformer module.
  The response from fetching is transformed and merged together into 1 single collection of pages.
  Should 1 of the endpoints request fail then it will have no impact on the other requests.

- Updated dependencies [aaaf255]
  - @jpmorganchase/mosaic-core@0.1.0-beta.15

## 0.1.0-beta.14

### Patch Changes

- dde3b5a: Feature release

  - Enhanced generators now have defaults.
    With one command (`yarn mosaic-create-site create`) it will generate a fully working site with both local and remote sources
  - Fix an issue where we could not clone from the master branch of git repos
  - Migrate to Next 13 image

- Updated dependencies [dde3b5a]
  - @jpmorganchase/mosaic-core@0.1.0-beta.14

## 0.1.0-beta.13

### Patch Changes

- d4da1df: incremental improvements

  - move colormode into store
  - ensure breadcrumbs and sidebar data is only added to frontmatter for pages which use a layout that has breadcrumbs or a sidebar
  - improve changeset so it can work standalone without a monorepo
  - resolev json5 vulnerability

- Updated dependencies [d4da1df]
  - @jpmorganchase/mosaic-core@0.1.0-beta.13

## 0.1.0-beta.12

### Patch Changes

- 9ec358b: Upgrade React to version 18 and NextJs to version 13
- Updated dependencies [9ec358b]
  - @jpmorganchase/mosaic-core@0.1.0-beta.12

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
  - @jpmorganchase/mosaic-core@0.1.0-beta.11

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
  - @jpmorganchase/mosaic-core@0.1.0-beta.10

## 0.1.0-beta.9

### Minor Changes

- c3fee89: initial components package

  - added JSDOM testing

## 0.1.0-beta.8

### Minor Changes

- 2dca0b1: initial release of Mosaic store package

## 0.1.0-beta.7

### Minor Changes

- f82c397: Initial release of theme and client side search

  We are iterating towards deploying our site code.

  This release includes

  - initial work for client-side search support
  - Mosaic theme.

## 0.1.0-beta.6

### Patch Changes

- c103b24: Release fixes for snapshot serve

## 0.1.0-beta.5

### Patch Changes

- 61a246c: This releases add support for generate / build and serve snapshots

## 0.1.0-beta.4

### Patch Changes

- bd285df: added dist to package.json

## 0.1.0-beta.3

### Patch Changes

- 457df5e: switch to public package

## 0.1.0-beta.2

### Patch Changes

- e1bbbe7: Initial release of Mosaic Core file-system.

  Mosaic is a content aggregating service which pulls content from heterogeneous data sources.

- 4b2bc51: pipped to 0.1.0-beta.1 for publishing to NPM

## 0.1.0

### Patch Changes

- e1bbbe7: Initial release of Mosaic Core file-system.

  Mosaic is a content aggregating service which pulls content from heterogeneous data sources.
