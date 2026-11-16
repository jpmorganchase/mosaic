import path from 'node:path';

export default {
  pageExtensions: ['.mdx'],
  serialisers: [{ modulePath: '@jpmorganchase/mosaic-serialisers/mdx', filter: /\.mdx$/ }],
  plugins: [
    {
      modulePath: '@jpmorganchase/mosaic-plugins/SiteMapPlugin',
      options: { siteUrl: 'https://docs.example.test/' }
    },
    {
      modulePath: '@jpmorganchase/mosaic-plugins/SearchIndexPlugin',
      options: { records: process.env.MOSAIC_CONSUMER_SEARCH !== 'disabled' && {} }
    },
    {
      modulePath: '@jpmorganchase/mosaic-plugins/LlmsTxtPlugin',
      options: { componentsModulePath: path.resolve('markdown-components.mjs') }
    },
    { modulePath: path.resolve('failing-plugin.mjs') }
  ],
  sources: [
    {
      modulePath: '@jpmorganchase/mosaic-source-local-folder',
      namespace: 'salt',
      options: { rootDir: './content', prefixDir: 'salt', extensions: ['.mdx'] }
    },
    {
      modulePath: '@jpmorganchase/mosaic-source-local-folder',
      namespace: 'other',
      options: { rootDir: './other-content', prefixDir: 'other', extensions: ['.mdx'] }
    }
  ]
};
