---
'@jpmorganchase/mosaic-create-site': patch
'@jpmorganchase/mosaic-standard-generator': patch
'@jpmorganchase/mosaic-cli': patch
'@jpmorganchase/mosaic-components': patch
'@jpmorganchase/mosaic-content-editor-plugin': patch
'@jpmorganchase/mosaic-core': patch
'@jpmorganchase/mosaic-layouts': patch
'@jpmorganchase/mosaic-open-api-component': patch
'@jpmorganchase/mosaic-plugins': patch
'@jpmorganchase/mosaic-rig': patch
'@jpmorganchase/mosaic-schemas': patch
'@jpmorganchase/mosaic-serialisers': patch
'@jpmorganchase/mosaic-site': patch
'@jpmorganchase/mosaic-site-components': patch
'@jpmorganchase/mosaic-site-middleware': patch
'@jpmorganchase/mosaic-site-preset-styles': patch
'@jpmorganchase/mosaic-source-git-repo': patch
'@jpmorganchase/mosaic-source-local-folder': patch
'@jpmorganchase/mosaic-store': patch
'@jpmorganchase/mosaic-theme': patch
'@jpmorganchase/mosaic-types': patch
'@jpmorganchase/mosaic-workflows': patch
---

Generators can now interactively add sources

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
