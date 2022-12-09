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

module.exports = {
  /** Generator name */
  generatorName,
  pageExtensions: ['.mdx', '.json'],
  ignorePages: ['shared-config.json', 'sitemap.xml', 'sidebar.json'],
  serialisers: [
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-serialisers/mdx'),
      filter: /\.mdx$/,
      options: {}
    },
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-serialisers/md'),
      filter: /\.md$/,
      options: {}
    }
  ],
  plugins: [
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-plugins/SiteMapPlugin'),
      options: {}
    },
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-plugins/BreadcrumbsPlugin'),
      options: {
        indexPageName: 'index.mdx'
      }
    },
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-plugins/LazyPagePlugin'),
      // This plugin must be the very last to run, so it can strip off metadata and content after the other
      // plugins are done with them
      priority: -2,
      // Exclude this plugin in builds
      runTimeOnly: true,
      options: {
        cacheDir: '.tmp/.pull-docs-last-page-plugin-cache'
      }
    },
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-plugins/NextPrevPagePlugin'),
      options: {
        // Make sure the index is always the first item in the next/prev queue
        indexFirst: true,
        // Sort alphabetically
        sortBy: 'a-z'
      },
      priority: 2
    },
    // TODO: Remove this plugin once the docs add file extensions in refs
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-plugins/PagesWithoutFileExtPlugin'),
      options: {}
    },
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-plugins/SidebarPlugin'),
      options: {
        filename: 'sidebar.json'
      }
    },
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-plugins/ReadingTimePlugin'),
      options: {}
    },
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-plugins/SharedConfigPlugin'),
      options: {
        filename: 'shared-config.json'
      },
      priority: 3
    }
  ],
  sources: []
};
