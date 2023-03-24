const deepmerge = require('deepmerge');
const mosaicConfig = require('@jpmorganchase/mosaic-standard-generator/dist/fs.config.js');

module.exports = deepmerge(mosaicConfig, {
  deployment: { mode: 'snapshot-file', platform: 'vercel' },
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
     * Access from your browser as http://localhost:3000/mosaic
     */
    {
      disabled: process.env.NODE_ENV !== 'development',
      modulePath: '@jpmorganchase/mosaic-source-local-folder',
      namespace: 'mosaic', // each site has it's own namespace, think of this as your content's uid
      options: {
        rootDir: '../../docs', // relative path to content
        prefixDir: 'mosaic', // root path used for namespace
        extensions: ['.mdx'] // extensions of content which should be pulled
      }
    }
  ]
});
