import dotenvLoad from 'dotenv-load';
dotenvLoad();

const config = {
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
    // --- Plugins from first config ---
    {
      modulePath: '@jpmorganchase/mosaic-plugins/SiteMapPlugin',
      previewDisabled: true,
      options: { siteUrl: process.env.SITE_URL || 'http://localhost:3000' }
    },
    {
      modulePath: '@jpmorganchase/mosaic-plugins/SearchIndexPlugin',
      previewDisabled: true,
      options: { maxLineLength: 240, maxLineCount: 240 }
    },
    {
      modulePath: '@jpmorganchase/mosaic-plugins/BreadcrumbsPlugin',
      options: { indexPageName: 'index.mdx' }
    },
    {
      modulePath: '@jpmorganchase/mosaic-plugins/LazyPagePlugin',
      priority: -2,
      runTimeOnly: true,
      options: { cacheDir: '.tmp/.pull-docs-last-page-plugin-cache' }
    },
    {
      modulePath: '@jpmorganchase/mosaic-plugins/PagesWithoutFileExtPlugin',
      options: {},
      priority: 1
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
      options: { filename: 'shared-config.json' },
      priority: 3
    },
    {
      modulePath: '@jpmorganchase/mosaic-plugins/TableOfContentsPlugin',
      options: { minRank: 2, maxRank: 3 }
    },
    // --- Plugins from second config ---
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
    },
    {
      modulePath: '@jpmorganchase/mosaic-plugins/DocumentAssetsPlugin',
      priority: -1,
      options: {
        srcDir: `../../docs`,
        outputDir: './public/images/mosaic',
        assetSubDirs: ['**/images'],
        imagesPrefix: '/images'
      }
    }
  ],
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
      namespace: 'mosaic',
      options: {
        rootDir: '../../docs',
        prefixDir: 'mosaic',
        extensions: ['.mdx']
      }
    },
    /**
     * Documentation, tags examples require multiple sources
     */
    {
      disabled: process.env.NODE_ENV !== 'development',
      modulePath: '@jpmorganchase/mosaic-source-local-folder',
      namespace: 'mosaic',
      options: {
        rootDir: '../../docs-tags',
        prefixDir: 'mosaic/products',
        extensions: ['.mdx']
      }
    }
  ]
};

export default config;
