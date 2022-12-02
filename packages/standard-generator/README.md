# Mosaic 'Standard' Site Generator

Use this generator with the `@dpmosaic/create-mosaic-site` package to generate a standard Mosaic site.

A standard Mosaic site is a good entry level generator which scaffolds a basic site & it's dependencies.

## Installation

yarn add @dpmosaic/mosaic-standard-generator

## Configuration

Edit your `mosaic.config.js` to include the generator and it's config.

```
const mosaicConfig = require('@dpmosaic/mosaic-standard-generator/dist/config');

module.exports = {
  /**
   * This is an extension point for further configs and generators
   * They will appear as options within the users create-mosaic-site interactive menu
   */
  generators: [
    '@dpmosaic/mosaic-standard-generator/dist/generator',
  ],
  configs: {
    mosaic: mosaicConfig
  }
};
```

## Further Help

NOTE: This generator is currently part of Mosaic default generators, provided by `create-mosaic-site`.

Refer to the `@dpmosaic/create-mosaic-site` documentation.
