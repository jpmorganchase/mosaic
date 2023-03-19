const deepmerge = require('deepmerge');
const mosaicConfig = require('@jpmorganchase/mosaic-standard-generator/dist/fs.config.js');

/** Enhance/modify your Mosaic core fs
 * pageExtensions: supported file extensions which can be stored in the Virtual File System (VFS) created by Core FS
 * ignorePages: list of files which will be ignored from pulled content,
 * serialisers: define serialisers and deserialisers for the supported file extensions
 * plugins: <...plugin definitions>
 * sources: <...source definitions>
 */
module.exports = deepmerge(mosaicConfig, {
  plugins: [
    {
      modulePath: '@jpmorganchase/mosaic-plugins/BrokenLinksPlugin',
      priority: -1,
      // Exclude this plugin in builds
      runTimeOnly: true,
      options: {
        baseUrl: process.env.MOSAIC_ACTIVE_MODE_URL || 'http://localhost:8080'
      }
    }
  ],
  sources: [
    /**
     * Demonstrates a local file-system source, in this case a relative path to where the
     * site was generated.
     * Access from your browser as http://localhost:3000/local
     */
    {
      disabled: process.env.NODE_ENV !== 'development',
      modulePath: '@jpmorganchase/mosaic-source-local-folder',
      namespace: 'local', // each site has it's own namespace, think of this as your content's uid
      options: {
        rootDir: '../../docs', // relative path to content
        prefixDir: 'local', // root path used for namespace
        extensions: ['.mdx'] // extensions of content which should be pulled
      }
    }
  ]
});
