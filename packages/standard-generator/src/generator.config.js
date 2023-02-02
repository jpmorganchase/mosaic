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
    { package: '@jpmorganchase/mosaic-standard-generator', version: `^${version}` },
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
      /**
       * Demonstrates a remote source, in this case the Mosaic site
       * Access from your browser as http://localhost:3000/mosaic
       */
      modulePath: '@jpmorganchase/mosaic-source-git-repo',
      namespace: 'mosaic', // each site has it's own namespace, think of this as your content's uid
      options: {
        // To run locally, enter your credentials to access the Git repo
        // e.g create the environment variable MOSAIC_DOCS_CLONE_CREDENTIALS
        // !! Polite Reminder... do not store credentials in code !!
        // For final deployments: you could put repo access credentials securely in environment variables provided by your host.
        // If running locally: create the environment variable MOSAIC_DOCS_CLONE_CREDENTIALS
        // export MOSAIC_DOCS_CLONE_CREDENTIALS="<repo username>:<Personal Access Token (PAT) provided by your Repo OR password>",
        credentials: process.env.MOSAIC_DOCS_CLONE_CREDENTIALS,
        prefixDir: 'mosaic', // root path used for namespace
        cache: true,
        subfolder: 'docs', // subfolder within your branch containing the docs, typically 'docs'
        repo: 'https://github.com/jpmorganchase/mosaic.git', // repo url
        branch: 'main', // branch where docs are pulled from
        extensions: ['.mdx'], // extensions of content which should be pulled
        remote: 'origin' // what is the shorthand name of the remote repo, typically 'origin'
      }
    },
    {
      /**
       * Demonstrates a local file-system source, in this case a relative path to where the
       * site was generated.
       * Access from your browser as http://localhost:3000/local
       */
      modulePath: '@jpmorganchase/mosaic-source-local-folder',
      namespace: 'local', // each site has it's own namespace, think of this as your content's uid
      options: {
        rootDir: './docs', // relative path to content
        prefixDir: 'local', // root path used for namespace
        extensions: ['.mdx'] // extensions of content which should be pulled
      }
    }
  ]
};
