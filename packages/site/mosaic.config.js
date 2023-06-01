const deepmerge = require('deepmerge');
const mosaicConfig = require('@jpmorganchase/mosaic-standard-generator/dist/fs.config.js');
const dotenvLoad = require('dotenv-load');
dotenvLoad();

const siteConfig = {
  ...mosaicConfig,
  plugins: [
    ...mosaicConfig.plugins,
    {
      modulePath: '@jpmorganchase/mosaic-plugins/SidebarPlugin',
      options: { rootDirGlob: '*/*' }
    },
    {
      modulePath: '@jpmorganchase/mosaic-plugins/BrokenLinksPlugin',
      priority: -1,
      // Exclude this plugin in builds
      runTimeOnly: true,
      options: {
        baseUrl: process.env.MOSAIC_ACTIVE_MODE_URL || 'http://localhost:8080'
      }
    },
    {
      modulePath: '@jpmorganchase/mosaic-plugins/PublicAssetsPlugin',
      priority: -1,
      options: {
        outputDir: './public',
        assets: ['sitemap.xml', 'search-data.json']
      }
    }
  ]
};

module.exports = deepmerge(siteConfig, {
  deployment: { mode: 'snapshot-file', platform: 'vercel' },
  sources: [
    /**
     * Demonstrates a local file-system source, in this case a relative path to where the
     * site was generated.
     * Access from your browser as http://localhost:3000/mosaic
     */
    {
      disabled: false,
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
