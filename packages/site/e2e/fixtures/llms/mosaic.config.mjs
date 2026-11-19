import { resolve } from 'node:path';
import fsConfig from '@jpmorganchase/mosaic-cli/fs.config.js';

const config = {
  ...fsConfig,
  ignorePages: [...fsConfig.ignorePages, 'ignored.mdx'],
  plugins: fsConfig.plugins.map(plugin =>
    plugin.modulePath.endsWith('/LlmsTxtPlugin')
      ? {
          ...plugin,
          options: {
            title: 'Fixture documentation',
            exclude: ['salt/private/**'],
            scopes: [
              { path: '/salt', title: 'Salt', description: 'Salt fixture docs.' },
              { path: '/salt/components', title: 'Components' },
              { path: '/mosaic', title: 'Mosaic' }
            ]
          }
        }
      : plugin
  ),
  sources: [
    { namespace: 'shared', prefixDir: 'salt', root: 'salt' },
    { namespace: 'shared', prefixDir: 'mosaic', root: 'mosaic' },
    { namespace: 'other', prefixDir: '', root: 'other' }
  ].map(({ namespace, prefixDir, root }) => ({
    namespace,
    modulePath: '@jpmorganchase/mosaic-source-local-folder',
    options: {
      rootDir: resolve(import.meta.dirname, root),
      prefixDir,
      extensions: ['.mdx', '.json'],
      cache: false
    }
  }))
};

export default config;
