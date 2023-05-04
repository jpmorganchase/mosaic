/** Mosaic core fs config
 *
 * Refer to the Mosaic documentation for full details
 *
 * generatorName: name of generator, should match the associated generator in generator.config.js
 * pageExtensions: supported file extensions which can be stored in the Virtual File System (VFS) created by Core FS
 * ignorePages: list of files which will be ignored from pulled content,
 * serialisers: define serialisers and deserialisers for the supported file extensions
 * plugins: <...plugin definitions>
 * sources: <...source definitions>
 *
 */
const { generatorName } = require('./generator');
const dotenvLoad = require('dotenv-load');
dotenvLoad();

module.exports = {
  /** Generator name */
  generatorName,
  pageExtensions: ['.mdx', '.json'],
  ignorePages: ['shared-config.json', 'sitemap.xml', 'sidebar.json'],
  serialisers: [
    {
      modulePath: '@jpmorganchase/mosaic-serialisers/mdx',
      filter: /\.mdx$/,
      options: {}
    },
    {
      modulePath: '@jpmorganchase/mosaic-serialisers/md',
      filter: /\.md$/,
      options: {}
    }
  ],
  plugins: [
    {
      modulePath: '@jpmorganchase/mosaic-plugins/SiteMapPlugin',
      options: { siteUrl: process.env.SITE_URL || 'http://localhost:3000' }
    },
    {
      modulePath: '@jpmorganchase/mosaic-plugins/SearchIndexPlugin',
      options: { maxLineLength: 240, maxLineCount: 240 }
    },
    {
      modulePath: '@jpmorganchase/mosaic-plugins/BreadcrumbsPlugin',
      options: {
        indexPageName: 'index.mdx'
      }
    },
    {
      modulePath: '@jpmorganchase/mosaic-plugins/LazyPagePlugin',
      // This plugin must be the very last to run, so it can strip off metadata and content after the other
      // plugins are done with them
      priority: -2,
      // Exclude this plugin in builds
      runTimeOnly: true,
      options: {
        cacheDir: '.tmp/.pull-docs-last-page-plugin-cache'
      }
    },
    // TODO: Remove this plugin once the docs add file extensions in refs
    {
      modulePath: '@jpmorganchase/mosaic-plugins/PagesWithoutFileExtPlugin',
      options: {}
    },
    {
      modulePath: '@jpmorganchase/mosaic-plugins/SidebarPlugin',
      options: {}
    },
    {
      modulePath: '@jpmorganchase/mosaic-plugins/ReadingTimePlugin',
      options: {}
    },
    {
      modulePath: '@jpmorganchase/mosaic-plugins/SharedConfigPlugin',
      options: {
        filename: 'shared-config.json'
      },
      priority: 3
    },
    {
      modulePath: '@jpmorganchase/mosaic-plugins/TableOfContentsPlugin',
      options: {
        minRank: 2,
        maxRank: 3
      }
    }
  ],
  sources: []
};
