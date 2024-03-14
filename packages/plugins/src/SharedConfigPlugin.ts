import crypto from 'node:crypto';
import path from 'node:path';
import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import { flatten } from 'lodash-es';
import deepmerge from 'deepmerge';
import { createPageTest } from './utils/createPageTest.js';

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
  async $afterSource(pages, { ignorePages, pageExtensions, config, namespace }) {
    const isNonHiddenPage = createPageTest(ignorePages, pageExtensions);
    let finalSharedConfig;

    const indexPages = pages.filter(
      page =>
        path.posix.basename(page.fullPath, path.posix.extname(page.fullPath)) === 'index' &&
        isNonHiddenPage(page.fullPath)
    );

    const indexPagesWithSharedConfig = indexPages.filter(page => page.sharedConfig !== undefined);

    if (indexPagesWithSharedConfig.length === 0 && indexPages.length > 0) {
      const rootPath = indexPages[0].fullPath;
      const applyNamespaceSharedConfig = {
        [`${crypto.randomUUID()}`]: {
          paths: indexPages.map(indexPage => indexPage.fullPath),
          rootPath,
          namespace
        }
      };
      config.setData({ applyNamespaceSharedConfig });
      return pages;
    }

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
    if (sharedConfigFiles.length > 0) {
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
  },
  async afterUpdate(mutableFilesystem, { sharedFilesystem, globalConfig, namespace }, options) {
    const { applyNamespaceSharedConfig } = globalConfig.data;

    if (applyNamespaceSharedConfig === undefined) {
      // there is no source that exists that has told us it needs to share a namespace shared-config
      return;
    }

    // find all the entries that match the namespace the plugin is running against
    const namespaceSharedConfigs: {
      paths: string[];
      rootPath: string;
      namespace: string;
    }[] = Object.keys(applyNamespaceSharedConfig)
      .filter(key => applyNamespaceSharedConfig[key].namespace === namespace)
      .map(key => applyNamespaceSharedConfig?.[key] || []);

    for (const namespaceSharedConfig of namespaceSharedConfigs) {
      if (await mutableFilesystem.promises.exists(namespaceSharedConfig.rootPath)) {
        // a source does need a namespace shared config but the source running this plugin is the source that needs it
        // so we don't need to do anything here
        continue;
      }

      for (const applyPath of namespaceSharedConfig.paths) {
        if (!(await sharedFilesystem.promises.exists(applyPath))) {
          sharedFilesystem.promises.mkdir(path.posix.dirname(String(applyPath)), {
            recursive: true
          });
        }
        let parentDir = path.posix.join(path.posix.dirname(String(applyPath)), '../');
        let closestSharedConfigPath = path.posix.join(parentDir, options.filename);

        while (parentDir !== path.posix.sep) {
          // walk up the directories in the path to find the closest shared config file
          closestSharedConfigPath = path.posix.join(parentDir, options.filename);
          if (await mutableFilesystem.promises.exists(closestSharedConfigPath)) {
            break;
          }
          parentDir = path.posix.join(path.posix.dirname(String(closestSharedConfigPath)), '../');
        }

        const aliasSharedConfigPath = path.posix.join(
          path.posix.dirname(String(applyPath)),
          options.filename
        );

        if (
          (await mutableFilesystem.promises.exists(closestSharedConfigPath)) &&
          !(await sharedFilesystem.promises.exists(aliasSharedConfigPath))
        ) {
          console.log(
            `[Mosaic][Plugin] Source has no shared config. Root index page is: ${namespaceSharedConfig.rootPath}`
          );
          console.log(
            '[Mosaic][Plugin] Copying shared config ',
            closestSharedConfigPath,
            '-->',
            aliasSharedConfigPath
          );
          await sharedFilesystem.promises.writeFile(
            aliasSharedConfigPath,
            await mutableFilesystem.promises.readFile(closestSharedConfigPath)
          );
        }
      }
    }
  }
};

export default SharedConfigPlugin;
