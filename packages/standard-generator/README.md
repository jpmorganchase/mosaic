# Mosaic 'Standard' Site Generator

Use this generator with the `@jpmorganchase/mosaic-create-site` package to generate a standard Mosaic site.

A standard Mosaic site is a good entry level generator which scaffolds a basic site & it's dependencies.

## Installation

yarn add @jpmorganchase/mosaic-standard-generator

## Configuration

Edit your `mosaic.config.mjs` to include the generator and it's config.

```
const mosaicConfig = require('@jpmorganchase/mosaic-standard-generator/dist/config');

module.exports = {
  /**
   * This is an extension point for further configs and generators
   * They will appear as options within the users mosaic-create-site interactive menu
   */
  generators: [
    '@jpmorganchase/mosaic-standard-generator/dist/generator',
  ],
  configs: {
    mosaic: mosaicConfig
  }
};
```

## Further Help

NOTE: This generator is currently part of Mosaic default generators, provided by `mosaic-create-site`.

Refer to the `@jpmorganchase/mosaic-create-site` documentation.
