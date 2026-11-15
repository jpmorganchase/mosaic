import path from 'node:path';

export default {
  pageExtensions: ['.mdx'],
  serialisers: [{ modulePath: '@jpmorganchase/mosaic-serialisers/mdx', filter: /\.mdx$/ }],
  plugins: [
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
    }
  ]
};
