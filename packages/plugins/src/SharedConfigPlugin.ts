import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import { flatten, escapeRegExp } from 'lodash-es';
import path from 'path';
import deepmerge from 'deepmerge';

function createPageTest(ignorePages, pageExtensions) {
  const extTest = new RegExp(`${pageExtensions.map(escapeRegExp).join('|')}$`);
  const ignoreTest = new RegExp(`${ignorePages.map(escapeRegExp).join('|')}$`);
  return file =>
    !ignoreTest.test(file) && extTest.test(file) && !path.basename(file).startsWith('.');
}

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
  const outerParentDir = path.posix.resolve(path.posix.dirname(outer), '../');
  const innerParentDir = path.posix.resolve(path.posix.dirname(inner), '../');
  const rel = path.posix.relative(outerParentDir, innerParentDir);
  return !rel.startsWith('../') && rel !== '..';
}

export interface SharedConfigPluginPage extends Page {
  sharedConfig?: string;
  frameOverrides?: any;
}

export interface SharedConfigPluginOptions {
  filename: string;
}

/**
 * Plugin that crawls the page hierarchy to find the closest `sharedConfig` from any parent index's page metadata.
 * It then exports a JSON file (name: `options.filename`) into each directory with the merged config for that level
 */
const SharedConfigPlugin: PluginType<SharedConfigPluginPage, SharedConfigPluginOptions> = {
  async $afterSource(pages, { ignorePages, pageExtensions }) {
    const isNonHiddenPage = createPageTest(ignorePages, pageExtensions);
    let finalSharedConfig;

    const indexPagesWithSharedConfig = pages.filter(
      page =>
        path.posix.basename(page.fullPath, path.posix.extname(page.fullPath)) === 'index' &&
        page.sharedConfig !== undefined &&
        isNonHiddenPage(page.fullPath)
    );

    for (const page of indexPagesWithSharedConfig) {
      if (finalSharedConfig === undefined) {
        // first shared config we have found so seed the finalSharedConfig
        finalSharedConfig = page.sharedConfig;
      } else {
        for (let i = 1; i < indexPagesWithSharedConfig.length; i++) {
          if (isWithin(indexPagesWithSharedConfig[i].fullPath, page.fullPath)) {
            // found another shared config so merge and apply to the page
            finalSharedConfig = deepmerge(finalSharedConfig, page.sharedConfig);
            page.sharedConfig = finalSharedConfig;
            page.frameOverrides = { $ref: '#/sharedConfig' };
          }
        }
      }
    }
    return pages;
  },

  async $beforeSend(
    mutableFilesystem,
    { config, serialiser, ignorePages, pageExtensions },
    options
  ) {
    const indexPagePaths = await mutableFilesystem.promises.glob(
      createFileGlob('**/index', pageExtensions),
      {
        ignore: [options.filename, ...flatten(ignorePages.map(ignore => [ignore, `**/${ignore}`]))],
        cwd: '/'
      }
    );

    const sharedConfigFiles: string[] = [];
    const indexPagesWithoutConfig: string[] = [];

    for (const indexPagePath of indexPagePaths) {
      const sharedConfigFile = path.posix.join(
        path.posix.dirname(String(indexPagePath)),
        options.filename
      );

      const page = await serialiser.deserialise(
        String(indexPagePath),
        await mutableFilesystem.promises.readFile(String(indexPagePath))
      );

      if (page.sharedConfig) {
        config.setRef(
          sharedConfigFile,
          ['config', '$ref'],
          `${String(indexPagePath)}#/sharedConfig`
        );
        await mutableFilesystem.promises.writeFile(sharedConfigFile, '{}');
        sharedConfigFiles.push(sharedConfigFile);
      } else {
        indexPagesWithoutConfig.push(page.fullPath);
      }
    }

    // apply closest shared config
    let closestSharedConfigIndex = 0;
    for (const pagePath of indexPagesWithoutConfig) {
      for (let i = 0; i < sharedConfigFiles.length; i++) {
        if (isWithin(sharedConfigFiles[i], pagePath)) {
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
