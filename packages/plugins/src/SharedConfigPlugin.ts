import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import { flatten } from 'lodash-es';
import path from 'path';

function createFileGlob(url, pageExtensions) {
  if (pageExtensions.length === 1) {
    return `${url}${pageExtensions[0]}`;
  }
  return `${url}{${pageExtensions.join(',')}}`;
}

/**
 * https://stackoverflow.com/a/50549047
 * compute inner relative to outer
 * If it's not contained, the first component of the resulting path will be .., so that's what we check for
 */
function isWithin(outer, inner) {
  const rel = path.posix.relative(outer, inner);
  return !rel.startsWith('../') && rel !== '..';
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

    const sharedConfigFiles = [];
    const pagesWithoutConfig: string[] = [];

    for (const pagePath of pagePaths) {
      const sharedConfigFile = path.posix.join(
        path.posix.dirname(String(pagePath)),
        options.filename
      );

      const page = await serialiser.deserialise(
        String(pagePath),
        await mutableFilesystem.promises.readFile(String(pagePath))
      );
      if (page.sharedConfig) {
        config.setRef(sharedConfigFile, ['config', '$ref'], `${String(pagePath)}#/sharedConfig`);
        await mutableFilesystem.promises.writeFile(sharedConfigFile, '{}');
        sharedConfigFiles.push(sharedConfigFile);
      } else {
        pagesWithoutConfig.push(page.fullPath);
      }
    }

    let closestSharedConfigIndex = 0;
    for (const pagePath of pagesWithoutConfig) {
      for (let i = 0; i < sharedConfigFiles.length; i++) {
        const sharedConfigBaseDir = path.posix.resolve(
          path.posix.dirname(sharedConfigFiles[i]),
          '../'
        );
        const pageBaseDir = path.posix.resolve(path.posix.dirname(String(pagePath)), '../');

        if (isWithin(sharedConfigBaseDir, pageBaseDir)) {
          closestSharedConfigIndex = i;
        }
      }

      const sharedConfigFile = path.posix.join(
        path.posix.dirname(String(pagePath)),
        options.filename
      );

      const closestSharedConfig = path.posix.resolve(
        path.dirname(String(pagePath)),
        sharedConfigFiles[closestSharedConfigIndex]
      );
      config.setAliases(closestSharedConfig, [sharedConfigFile]);
    }
  }
};

export default SharedConfigPlugin;
