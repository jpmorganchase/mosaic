import dotenvLoad from 'dotenv-load';
import deepmerge from 'deepmerge';
import mosaicConfig from '@jpmorganchase/mosaic-standard-generator/dist/fs.config.js';

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
      modulePath: '@jpmorganchase/mosaic-plugins/FragmentPlugin',
      options: {}
    },
    {
      modulePath: '@jpmorganchase/mosaic-plugins/PublicAssetsPlugin',
      priority: -1,
      options: {
        outputDir: './public',
        assets: [
          'search-config.json',
          'search-data.json',
          'search-data-condensed.json',
          'sitemap.xml'
        ]
      }
    }
  ]
};

export default deepmerge(siteConfig, {
  deployment: { mode: 'snapshot-file', platform: 'vercel' },
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
