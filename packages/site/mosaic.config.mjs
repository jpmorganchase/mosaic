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
        assets: ['sitemap.xml', 'search-data.json']
      }
    }
  ]
};

export default deepmerge(siteConfig, {
  deployment: { mode: 'snapshot-file', platform: 'vercel' },
  sources: [
    // add source here!
  ]
});
