import path from 'path';
import type { MosaicConfig } from '@jpmorganchase/mosaic-types';
import { BitBucketPullRequestWorkflow } from '@jpmorganchase/mosaic-workflows';

const config: MosaicConfig = {
  pageExtensions: ['.mdx', '.json', '.md'],
  ignorePages: ['shared-config.json', 'sitemap.xml', 'sidebar.json'],
  serialisers: [
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-serialisers/dist/mdx'),
      filter: /\.mdx$/
    },
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-serialisers/dist/md'),
      filter: /\.md$/
    }
  ],
  plugins: [
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-plugins/dist/SiteMapPlugin')
    },

    {
      modulePath: require.resolve('@jpmorganchase/mosaic-plugins/dist/BreadcrumbsPlugin'),
      options: {
        indexPageName: 'index.mdx'
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
      modulePath: require.resolve('@jpmorganchase/mosaic-plugins/dist/PagesWithoutFileExtPlugin')
    },
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-plugins/dist/SidebarPlugin'),
      options: {
        filename: 'sidebar.json'
      }
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
        rootDir: path.join('../developer-docs', 'docs'),
        cache: true,
        prefixDir: 'local',
        extensions: ['.mdx']
      }
    },
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-source-git-repo'),
      namespace: 'developer',
      workflows: [BitBucketPullRequestWorkflow],
      options: {
        // To run locally, enter your credentials to access the BitBucket repo
        // !! Polite Reminder... do not store credentials in code !!
        // For final deployments, you could put repo access credentials securely in environment variables provided by Gaia console.
        // credentials: "{process.env.FID}:{process.env.FID_PERSONAL_ACCESS_TOKEN}",
        // If running locally
        // create an environment variable like MOSAIC_DOCS_CLONE_CREDENTIALS to let the user define it via the CLI
        // export MOSAIC_DOCS_CLONE_CREDENTIALS="<sid>:<Personal Access Token (PAT) provided by your Repo OR password>",
        prefixDir: 'developer',
        credentials: process.env.MOSAIC_DOCS_CLONE_CREDENTIALS,
        subfolder: 'docs', // subfolder within your branch containing the docs, typically 'docs'
        repo: process.env.DEVELOPER_DOCS_REPO, // repo url without any protocol
        branch: 'develop', // branch where docs are pulled from
        extensions: ['.mdx'], // extensions of content which should be pulled
        remote: 'origin' // what is the shorthand name of the remote repo, typically 'origin'
      }
    },
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-source-git-repo'),
      namespace: 'mosaic-docs',
      options: {
        prefixDir: 'mosaic-docs',
        credentials: process.env.MOSAIC_DOCS_CLONE_CREDENTIALS,
        subfolder: 'docs',
        repo: 'github.com/DavieReid/mosaic-docs.git',
        branch: 'main',
        extensions: ['.mdx'],
        remote: 'origin'
      }
    }
  ]
};

module.exports = config;
