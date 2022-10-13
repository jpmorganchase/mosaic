import path from 'path';
import type { PullDocsConfig } from '@jpmorganchase/mosaic-types/dist/PullDocsConfig';

const config: PullDocsConfig = {
  pageExtensions: ['.mdx', '.json'],
  ignorePages: ['shared-config.json', 'sitemap.xml', 'sidebar.json'],
  serialisers: [
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-serialisers/dist/mdx'),
      filter: /\.mdx$/,
      options: {}
    },
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-serialisers/dist/md'),
      filter: /\.md$/,
      options: {}
    }
  ],
  plugins: [
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-plugins/dist/SiteMapPlugin'),
      options: {}
    },
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-plugins/dist/BreadcrumbsPlugin'),
      options: {
        indexPageName: 'index.mdx'
      }
    },
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-plugins/dist/TableOfContentsPlugin.mjs'),
      options: {
        minRank: 2,
        maxRank: 4
      }
    },
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-plugins/dist/LazyPagePlugin'),
      // This plugin must be the very last to run, so it can strip off metadata and content after the other
      // plugins are done with them
      priority: -2,
      // Exclude this plugin in builds
      runTimeOnly: true,
      options: {
        cacheDir: '.tmp/.mosaic-last-page-plugin-cache'
      }
    },
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-plugins/dist/NextPrevPagePlugin'),
      options: {
        // Make sure the index is always the first item in the next/prev queue
        indexFirst: true,
        // Sort alphabetically
        sortBy: 'a-z'
      },
      priority: 2
    },
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-plugins/dist/PagesWithoutFileExtPlugin'),
      options: {}
    },
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-plugins/dist/SidebarPlugin'),
      options: {
        filename: 'sidebar.json'
      }
    },
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-plugins/dist/ReadingTimePlugin.mjs'),
      options: {}
    },
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-plugins/dist/SharedConfigPlugin'),
      options: {
        filename: 'shared-config.json'
      },
      priority: 3
    }
  ],
  sources: [
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-source-local-folder'),
      namespace: 'local',
      options: {
        rootDir: path.join(__dirname, '../', 'docs'),
        cache: true,
        prefixDir: 'example',
        extensions: ['.mdx']
      }
    }
  ]
};

module.exports = config;
