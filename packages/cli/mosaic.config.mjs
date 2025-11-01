import deepmerge from 'deepmerge';
import fsConfig from './fs.config.js';

const siteConfig = {
  ...fsConfig,
  plugins: [
    ...fsConfig.plugins,
    {
      modulePath: '@jpmorganchase/mosaic-plugins/SidebarPlugin',
      options: { rootDirGlob: '*/*' }
    }
  ]
};

export default deepmerge(siteConfig, {
  sources: [
    {
      modulePath: '@jpmorganchase/mosaic-source-local-folder',
      namespace: 'mosaic', // each site has it's own namespace, think of this as your content's uid
      options: {
        rootDir: './docs', // relative path to content
        prefixDir: 'mosaic', // root path used for namespace
        extensions: ['.mdx'] // extensions of content which should be pulled
      }
    }
  ]
});
