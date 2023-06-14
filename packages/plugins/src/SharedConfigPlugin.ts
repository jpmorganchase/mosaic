import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import { flatten } from 'lodash-es';
import path from 'path';

function createFileGlob(url, pageExtensions) {
  if (pageExtensions.length === 1) {
    return `${url}${pageExtensions[0]}`;
  }
  return `${url}{${pageExtensions.join(',')}}`;
}

interface SharedConfigPluginPage extends Page {
  sharedConfig?: string;
}

interface SharedConfigPluginOptions {
  filename: string;
}

/**
 * Plugin that crawls the page hierarchy to find the closest `sharedConfig` from any parent index's page metadata.
 * It then exports a JSON file (name: `options.filename`) into each directory with the merged config for that level
 */
const SharedConfigPlugin: PluginType<SharedConfigPluginPage, SharedConfigPluginOptions> = {
  async $beforeSend(
    mutableFilesystem,
    { config, serialiser, ignorePages, pageExtensions },
    options
  ) {
    const pagePaths = await mutableFilesystem.promises.glob(
      createFileGlob('**/index', pageExtensions),
      {
        ignore: [options.filename, ...flatten(ignorePages.map(ignore => [ignore, `**/${ignore}`]))],
        cwd: '/'
      }
    );

    for (const pagePath of pagePaths) {
      const sharedConfigFile = path.posix.join(path.dirname(String(pagePath)), options.filename);

      const page = await serialiser.deserialise(
        String(pagePath),
        await mutableFilesystem.promises.readFile(String(pagePath))
      );
      if (page.sharedConfig) {
        config.setRef(sharedConfigFile, ['config', '$ref'], `${String(pagePath)}#/sharedConfig`);
        await mutableFilesystem.promises.writeFile(sharedConfigFile, '{}');
      } else {
        const baseDir = path.posix.resolve(path.dirname(String(pagePath)), '../');

        config.setAliases(path.join(baseDir, options.filename), [sharedConfigFile]);
      }
    }
  }
};

export default SharedConfigPlugin;
