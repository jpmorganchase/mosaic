# @jpmorganchase/mosaic-standard-generator

## 0.1.0-beta.55

## 0.1.0-beta.54

## 0.1.0-beta.53

## 0.1.0-beta.52

## 0.1.0-beta.51

## 0.1.0-beta.50

## 0.1.0-beta.49

## 0.1.0-beta.48

## 0.1.0-beta.47

## 0.1.0-beta.46

## 0.1.0-beta.45

## 0.1.0-beta.44

## 0.1.0-beta.43

### Patch Changes

- c0ee0f3: ### Fixes

  - Breadcrumb label matches sidebar label if available.
  - When breadcrumbs collapse into a menu button, the breadcrumb label is used for the menu items.
  - Collapsed breadcrumbs will navigate to the page the breadcrumb represents
  - Breadcrumb links no longer include the unnecessary file extension

## 0.1.0-beta.42

## 0.1.0-beta.41

## 0.1.0-beta.40

## 0.1.0-beta.39

## 0.1.0-beta.38

## 0.1.0-beta.37

## 0.1.0-beta.36

## 0.1.0-beta.35

### Patch Changes

- 00a9408: Use `next/font` to load fonts

## 0.1.0-beta.34

## 0.1.0-beta.33

### Patch Changes

- cb18c31: Mosaic site creators no longer needs to install `@jpmorganchase/mosaic-create-site` globally

  To generate a site, use `npx`
  `npx @jpmorganchase/mosaic-create-site create -o my-sample-site`

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

- 7ed1ee7: Upgrade to latest version of NextJs (v13.4.1)
- 8c854fd: - Upgrade `next-auth` version
  - Update `withSession` mosaic middleware to use `next-auth`

## 0.1.0-beta.31

### Minor Changes

- 0f702ad: Enable reading of environment variables in config files

### Patch Changes

- b609fd0: Added support for containerization of the site and cli as well as providing config for kubernetes development (skaffold)

  ## @jpmorganchase/mosaic-cli

  The cli package has been updated to support containerization.

## 0.1.0-beta.30

### Patch Changes

- 18ef436: The git repo source no longer generates a double slash between the repo host and repo path.

## 0.1.0-beta.29

### Minor Changes

- c78deb4: Flatten Sidebar
  Search Optimisation
  Public Assets Plugin
  TOC Indentation

## 0.1.0-beta.28

### Patch Changes

- 27ac914: 1. Layout improvements. 2. Fix: if a user hits a url that lands on a directory, the index file within that directory is resolved as the content. 3. Fix: improve Table of Contents component highlighting.

## 0.1.0-beta.27

### Patch Changes

- b465413: Improvements to vercel deployments

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

## 0.1.0-beta.25

### Minor Changes

- 93e9b07: The theme contract provided by the `@jpmorganchase/mosaic-theme` package now uses locally scoped variable names via a Vanilla Extract [Theme Contract](https://vanilla-extract.style/documentation/api/create-theme-contract/). Previously the theme variables were globally scoped resulting in conflicts with other design systems.

### Patch Changes

- a36219c: - Next/Prev page buttons were not appearing at the bottom of a page sequence
  - Removed redundant snapshot page api

## 0.1.0-beta.24

### Patch Changes

- 049d9af: 1. Pip Salt version 2. Issues 155, make 500 error more specific 3. button and sidebar styles 4. search opt-out

## 0.1.0-beta.23

### Patch Changes

- 513d45f: Sidebar behavior and styling changes.
  Add Client-side search feature.
  Relax node engine requirements.
  Removal of patches from the site package.
  Update site generator templates.

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

## 0.1.0-beta.14

### Patch Changes

- dde3b5a: Feature release

  - Enhanced generators now have defaults.
    With one command (`yarn mosaic-create-site create`) it will generate a fully working site with both local and remote sources
  - Fix an issue where we could not clone from the master branch of git repos
  - Migrate to Next 13 image

## 0.1.0-beta.13

### Patch Changes

- d4da1df: incremental improvements

  - move colormode into store
  - ensure breadcrumbs and sidebar data is only added to frontmatter for pages which use a layout that has breadcrumbs or a sidebar
  - improve changeset so it can work standalone without a monorepo
  - resolev json5 vulnerability

## 0.1.0-beta.12

### Patch Changes

- 9ec358b: Upgrade React to version 18 and NextJs to version 13
- 3eb35bf: initial work to enable generators to run outside of the repo

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
