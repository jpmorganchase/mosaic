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
const path = require('path');
const { generatorName } = require('./generator');

const { version } = require('../package.json');

module.exports = {
  /** Generator name */
  generatorName: 'mosaic',
  description: 'Standard Site Generator',
  version: '0.1.0',
  /** Package Name */
  name: '@jpmorganchase/mosaic-site',
  /** Home page URL */
  homepage: '/mosaic',
  /**
   * Dependencies added to package.json
   *
   * package: package name
   * version: version of package
   * */
  dependencies: [
    /* Mosaic site dependencies */
    { package: '@jpmorganchase/mosaic-components', version: `^${version}` },
    { package: '@jpmorganchase/mosaic-content-editor-plugin', version: `^${version}` },
    { package: '@jpmorganchase/mosaic-layouts', version: `^${version}` },
    { package: '@jpmorganchase/mosaic-site-components', version: `^${version}` },
    { package: '@jpmorganchase/mosaic-site-preset-styles', version: `^${version}` },
    { package: '@jpmorganchase/mosaic-store', version: `^${version}` },
    { package: '@jpmorganchase/mosaic-theme', version: `^${version}` },
    /* Mosaic core filesystem dependencies */
    { package: '@jpmorganchase/mosaic-cli', version: `^${version}` },
    { package: '@jpmorganchase/mosaic-core', version: `^${version}` },
    { package: '@jpmorganchase/mosaic-plugins', version: `^${version}` },
    { package: '@jpmorganchase/mosaic-schemas', version: `^${version}` },
    { package: '@jpmorganchase/mosaic-serialisers', version: `^${version}` },
    { package: '@jpmorganchase/mosaic-source-git-repo', version: `^${version}` },
    { package: '@jpmorganchase/mosaic-source-local-folder', version: `^${version}` },
    { package: '@jpmorganchase/mosaic-types', version: `^${version}` }
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
      import: `import { components as mosaicComponents } from '@jpmorganchase/mosaic-site-components';`,
      identifier: 'mosaicComponents',
      type: 'component'
    },
    {
      import: `import { layouts as mosaicLayouts } from '@jpmorganchase/mosaic-layouts';`,
      identifier: 'mosaicLayouts',
      type: 'layout'
    },
    {
      import: "import '@jpmorganchase/mosaic-site-preset-styles/index.css';"
    }
  ],
  sources: [
    {
      modulePath: '@jpmorganchase/mosaic-source-local-folder',
      namespace: 'mosaic',
      options: {
        rootDir: path.join(process.env.INIT_CWD, 'docs'),
        cache: true,
        prefixDir: 'mosaic',
        extensions: ['.mdx']
      }
    }
  ]
};
