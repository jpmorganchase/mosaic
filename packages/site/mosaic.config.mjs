import dotenvLoad from 'dotenv-load';
import deepmerge from 'deepmerge';
import mosaicConfig from '@jpmorganchase/mosaic-standard-generator/dist/fs.config.js';
import { sourceScheduleSchema } from '@jpmorganchase/mosaic-schemas';
import { z } from 'zod';

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
    },
    // {
    //   disabled: process.env.NODE_ENV !== 'development',
    //   modulePath: '@jpmorganchase/mosaic-source-figma',
    //   namespace: 'salt', // each site has it's own namespace, think of this as your content's uid
    //   options: {
    //     proxyEndpoint: 'http://proxy.jpmchase.net:8443',
    //     prefixDir: 'salt/internal/community-patterns',
    //     coverUrlPrefix: 'https://figma-store.apps.test.na-1z.gap.jpmchase.net/gallery',
    //     endpoints: {
    //       getAllTags: 'https://dxd-gallery.apps.test.na-1z.gap.jpmchase.net/api/areasOfWork',
    //       getAllProjectsForTag:
    //           'https://dxd-gallery.apps.test.na-1z.gap.jpmchase.net/api/projects?pagination=false',
    //       getProject: 'https://dxd-gallery.apps.test.na-1z.gap.jpmchase.net/project'
    //     }
    //   }
    // },
    {
      disabled: process.env.NODE_ENV !== 'development',
      modulePath: '@jpmorganchase/mosaic-source-figma-next',
      namespace: 'salt', // each site has it's own namespace, think of this as your content's uid
      schedule: { checkIntervalMins: 0.25, initialDelayMs: 0 },
      options: {
        cache: false,
        proxyEndpoint: 'http://proxy.jpmchase.net:8443',
        prefixDir: '/salt/internal/community-index',
        figmaToken: process.env.FIGMA_TOKEN,
        projects: [114431302],
        endpoints: {
          getFile: 'https://api.figma.com/v1/files/:file_id?plugin_data=shared',
          getProject: 'https://api.figma.com/v1/projects/:project_id/files'
        }
      }
    },
    {
      disabled: process.env.NODE_ENV !== 'development',
      modulePath: '@jpmorganchase/mosaic-source-storybook',
      namespace: 'salt', //
      schedule: { checkIntervalMins: 0.25, initialDelayMs: 0 }, // each site has it's own namespace, think of this as your content's uid
      options: {
        cache: false,
        proxyEndpoint: 'http://proxy.jpmchase.net:8443',
        prefixDir: '/salt/internal/community-index/story-navigation',
        stories: [
          {
            url: 'https://storybook.saltdesignsystem.com',
            owner: 'Payments',
            additionalTags: ['salt-pattern-navigation'],
            filter: /Lab\/Badge/
          }
        ]
      }
    },
    {
      modulePath: '@jpmorganchase/mosaic-source-local-folder',
      namespace: 'salt',
      options: {
        rootDir: '../../../salt-ds-internal-docs/docs',
        prefixDir: 'salt/internal',
        extensions: ['.mdx']
      }
    }
  ]
});
