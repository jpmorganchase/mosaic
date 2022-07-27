import reduce from 'lodash/reduce';
import $RefParser from '@apidevtools/json-schema-ref-parser';

import type PluginType from '@pull-docs/types/dist/Plugin';
import type Page from '@pull-docs/types/dist/Page';
import normaliseRefs from './utils/normaliseRefs';
import { escapeRegExp } from 'lodash';
import path from 'path';

/**
 * Plugin that scrapes `$ref` properties from page metadata and also applies all refs stored in `config.data.refs`.
 * Other plugins can use `setRef` to apply new refs, as long as they call it before this plugin has reaches `$beforeSend`
 */
const $RefPlugin: PluginType<{
  refs: { [key: string]: { $$path: string[]; $$value: string }[] };
}> = {
  async $beforeSend(mutableFilesystem, { config, serialiser, pageExtensions, ignorePages }, options) {
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
        const page: Page = await serialiser.deserialise(
          fullPath,
          await mutableFilesystem.promises.readFile(fullPath)
        );

        normalisedRefs[fullPath] = {
          ...page,
          ...(await normaliseRefs(
            String(fullPath),
            config.data.refs[fullPath],
            mutableFilesystem,
            pageExtensions,
            ignorePages
          ))
        };
      }

      const resolve = createRefResolver(normalisedRefs, serialiser, mutableFilesystem);
      const refParser = new $RefParser();

      // Second pass of refs, resolves the refs
      for (const fullPath in normalisedRefs) {
        const page = normalisedRefs[fullPath];
        try {
          const resolved: $RefParser.JSONSchema = await refParser.dereference(String(fullPath), page, {
            resolve,
            dereference: { circular: false }
          });
          normalisedRefs[fullPath] = { ...page, ...resolved };
        } catch (e) {
          console.warn(`Error resolving ref(s) for page '${fullPath}'. ${e.message.replace(/\.$/, '')} in '${e.source}'`);
          throw e;
        }
      }
      // Third pass, write out the files
      for (const fullPath in normalisedRefs) {
        await mutableFilesystem.promises.writeFile(
          fullPath,
          await serialiser.serialise(fullPath, normalisedRefs[fullPath])
        );
      }
    }
  },
  async $afterSource(pages: Page[], { config, ignorePages, pageExtensions }) {
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
          return callback(null, refedPage);
        } catch (e) {
          return callback(e, null);
        }
      }
    }
  };
}

const findKeys = (obj, targetProp, pathParts: string[] = []): [string[], string][] => {
  return reduce<string, [string[], string][]>(
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
};

function createPageTest(ignorePages, pageExtensions) {
  const extTest = new RegExp(`${pageExtensions.map(escapeRegExp).join('|')}$`);
  const ignoreTest = new RegExp(`${ignorePages.map(escapeRegExp).join('|')}$`);
  return file => {
    return !ignoreTest.test(file) && extTest.test(file) && !path.basename(file).startsWith('.');
  };
}
