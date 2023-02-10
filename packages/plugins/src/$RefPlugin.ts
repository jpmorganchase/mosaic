import path from 'path';
import { reduce, omit, merge, escapeRegExp } from 'lodash-es';
import $RefParser from '@apidevtools/json-schema-ref-parser';
import type { Plugin as PluginType } from '@jpmorganchase/mosaic-types';

import normaliseRefs from './utils/normaliseRefs.js';

function createRefResolver(normalisedRefs, serialiser, mutableFilesystem) {
  return {
    file: {
      canRead: true,
      order: 1,
      async read(file, callback) {
        try {
          const refedPage =
            normalisedRefs[file.url] ||
            (await serialiser.deserialise(
              file.url,
              await mutableFilesystem.promises.readFile(file.url)
            ));
          return callback(null, omit(refedPage, 'content'));
        } catch (e) {
          return callback(e, null);
        }
      }
    }
  };
}

const findKeys = (obj, targetProp, pathParts: string[] = []): [string[], string][] =>
  reduce<string, [string[], string][]>(
    obj,
    (found, value, key) => {
      if (key === targetProp) {
        return found.concat([[pathParts.concat(String(key)), value]]);
      }
      if (typeof value === 'object') {
        const foundParents = findKeys(value, targetProp, pathParts.concat(String(key)));
        return found.concat(foundParents);
      }
      return found;
    },
    []
  );

function createPageTest(ignorePages, pageExtensions) {
  const extTest = new RegExp(`${pageExtensions.map(escapeRegExp).join('|')}$`);
  const ignoreTest = new RegExp(`${ignorePages.map(escapeRegExp).join('|')}$`);
  return file =>
    !ignoreTest.test(file) && extTest.test(file) && !path.basename(file).startsWith('.');
}

interface RefsPluginConfigData {
  refs: { [key: string]: { $$path: string[]; $$value: string }[] };
  globalRefs: { [key: string]: { $$path: string[]; $$value: string }[] };
  subscribedTags: string[];
}

interface RefsPluginPage {
  fullPath: string;
  refs: { [key: string]: { $$path: string[]; $$value: string }[] };
}

/**
 * Plugin that scrapes `$ref` properties from page metadata and also applies all refs stored in `config.data.refs`.
 * Other plugins can use `setRef` to apply new refs, as long as they call it before this plugin has reaches `$beforeSend`
 */
const $RefPlugin: PluginType<RefsPluginPage, unknown, RefsPluginConfigData> = {
  async afterUpdate(
    mutableFilesystem,
    { ignorePages, globalFilesystem, serialiser, pageExtensions, globalConfig }
  ) {
    mutableFilesystem.__internal_do_not_use_addReadFileHook(async (pagePath: string, fileData) => {
      if (globalConfig.data.globalRefs[pagePath]) {
        const normalisedRef = merge(
          await serialiser.deserialise(pagePath, fileData),
          await normaliseRefs(
            String(pagePath),
            globalConfig.data.globalRefs[pagePath],
            globalFilesystem,
            pageExtensions,
            ignorePages
          )
        );
        const resolve = createRefResolver(
          {
            [pagePath]: normalisedRef
          },
          serialiser,
          globalFilesystem
        );
        const refParser = new $RefParser();

        try {
          const resolved = await refParser.dereference(String(pagePath), normalisedRef, {
            resolve,
            dereference: { circular: false }
          });
          const serialisedPage = await serialiser.serialise(
            pagePath,
            merge(normalisedRef, resolved)
          );
          return serialisedPage;
        } catch (e) {
          console.warn(
            `Error resolving ref(s) for page '${pagePath}'. ${e.message.replace(/\.$/, '')} in '${
              e.source
            }'`
          );
          throw e;
        }
      }

      return fileData;
    });
  },
  async $beforeSend(mutableFilesystem, { config, serialiser, pageExtensions, ignorePages }) {
    // Prevent any more refs being set after this lifecycle has been called - as they won't take effect
    config.setRef = () => {
      throw new Error(
        'Cannot set refs after `RefPlugin` has reached `$beforeSend` lifecycle phase.'
      );
    };
    const normalisedRefs = {};

    if (config.data.refs) {
      // First pass of refs, normalises any $ref entries to expand wildcards
      for (const fullPath in config.data.refs) {
        const page = await serialiser.deserialise(
          fullPath,
          await mutableFilesystem.promises.readFile(fullPath)
        );
        normalisedRefs[fullPath] = merge(
          page,
          await normaliseRefs(
            String(fullPath),
            config.data.refs[fullPath],
            mutableFilesystem,
            pageExtensions,
            ignorePages
          )
        );
      }

      // const resolve = createRefResolver(normalisedRefs, serialiser, mutableFilesystem);
      // const refParser = new $RefParser();

      // // Second pass of refs, resolves the refs
      // for (const fullPath in normalisedRefs) {
      //   const page = normalisedRefs[fullPath];
      //   try {
      //     const resolved = await refParser.dereference(String(fullPath), page, {
      //       resolve,
      //       dereference: { circular: false }
      //     });
      //     normalisedRefs[fullPath] = { ...page, ...resolved };
      //   } catch (e) {
      //     console.warn(
      //       `Error resolving ref(s) for page '${fullPath}'. ${e.message.replace(/\.$/, '')} in '${
      //         e.source
      //       }'`
      //     );
      //     throw e;
      //   }
      // }
      // // Third pass, write out the files
      // for (const fullPath in normalisedRefs) {
      //   await mutableFilesystem.promises.writeFile(
      //     fullPath,
      //     await serialiser.serialise(fullPath, normalisedRefs[fullPath])
      //   );
      // }
    }
  },
  async $afterSource(pages, { config, ignorePages, pageExtensions }) {
    const isNonHiddenPage = createPageTest(ignorePages, pageExtensions);

    for (const page of pages) {
      if (!isNonHiddenPage(page.fullPath)) {
        continue;
      }
      const refs = findKeys(page, '$ref');

      if (refs.length) {
        for (const ref of refs) {
          config.setRef(page.fullPath, ...ref);
        }
      }
    }
    return pages;
  }
};

export default $RefPlugin;
