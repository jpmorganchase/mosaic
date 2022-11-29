/** Mosaic generator config
 *
 * This file defines the environment passed through to the generator/plopfile
 * Refer to the Mosaic documentation for full details.
 *
 * generatorName: name of generator, should match the associated generator in fs.config.js
 * name: site package name, added to package.json
 * dependencies: Dependencies added to package.json
 * imports: Extended imports used in site's _app.tsx
 *
 */
const { generatorName } = require('./generator');

module.exports = {
  /** Generator name */
  generatorName,
  /** Name */
  name: '@dpmosaic/site',
  /**
   * Dependencies added to package.json
   *
   * package: package name
   * version: version of package
   * */
  dependencies: [
    /* Mosaic site dependencies */
    { package: '@dpmosaic/components', version: '^1.0.0' },
    { package: '@dpmosaic/plugin-content-editor', version: '^1.0.0' },
    { package: '@dpmosaic/site-components', version: '^1.0.0' },
    { package: '@dpmosaic/site-layout', version: '^1.0.0' },
    { package: '@dpmosaic/site-preset-styles', version: '^1.0.0' },
    { package: '@dpmosaic/site-store', version: '^1.0.0' },
    /* Mosaic core filesystem dependencies */
    { package: '@jpmorganchase/mosaic-cli', version: '^0.1.0-beta.4' },
    { package: '@jpmorganchase/mosaic-core', version: '^0.1.0-beta.4' },
    { package: '@jpmorganchase/mosaic-types', version: '^0.1.0-beta.4' },
    { package: '@jpmorganchase/mosaic-serialisers', version: '^0.1.0-beta.4' },
    { package: '@jpmorganchase/mosaic-plugins', version: '^0.1.0-beta.4' },
    { package: '@jpmorganchase/mosaic-source-local-folder', version: '^0.1.0-beta.4' },
    { package: '@jpmorganchase/mosaic-source-bitbucket', version: '^0.1.0-beta.4' }
  ],
  /**
   * Extended imports used in site's _app.tsx
   *
   *  import: the import statement of a dependency
   *  identifier: the identifier created by the import
   *  type: component, layout, undefined (if undefined the dependency is just imported)
   * */
  imports: [
    {
      import: `import { components as mosaicComponents } from '@dpmosaic/site-components';`,
      identifier: 'mosaicComponents',
      type: 'component'
    },
    {
      import: `import { layouts as mosaicLayouts } from '@dpmosaic/site-layout';`,
      identifier: 'mosaicLayouts',
      type: 'layout'
    },
    {
      import: "import '@dpmosaic/site-preset-styles/dist/index.css';"
    }
  ]
};
