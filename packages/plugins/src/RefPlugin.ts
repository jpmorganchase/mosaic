import reduce from 'lodash/reduce';
import $RefParser from '@apidevtools/json-schema-ref-parser';

import type PluginType from '@pull-docs/types/dist/Plugin';
import type Page from '@pull-docs/types/dist/Page';
import normaliseRefs from './utils/normaliseRefs';

/**
 * Plugin that scrapes `$ref` properties from page metadata and also applies all refs stored in `config.data.refs`.
 * Other plugins can use `setRef` to apply new refs, as long as they call it before this plugin has reaches `$beforeSend`
 */
const RefPlugin: PluginType<{
  refs: { [key: string]: { $$path: string[]; $$value: string }[] };
}> = {
  async $beforeSend(mutableFilesystem, { config, serialiser, pageExtensions }, options) {
    // Prevent any more refs being set after this lifecycle has been called - as they won't take effect
    config.setRef = () => {
      throw new Error(
        'Cannot set refs after `RefPlugin` has reaches `$beforeSend` lifecycle phase.'
      );
    };
    const normalisedRefs = {};

    if (config.data.refs) {
      // First pass of refs, normalises any $ref entries to expand wildcards
      for (const route in config.data.refs) {
        const page: Page = await serialiser.deserialise(
          route,
          await mutableFilesystem.promises.readFile(route)
        );

        normalisedRefs[route] = {
          ...page,
          ...(await normaliseRefs(
            String(route),
            config.data.refs[route],
            mutableFilesystem,
            pageExtensions
          ))
        };
      }

      const resolve = createRefResolver(normalisedRefs, serialiser, mutableFilesystem);
      const refParser = new $RefParser();

      // Second pass of refs, resolves the refs
      for (const route in normalisedRefs) {
        const page = normalisedRefs[route];
        try {
          const resolved: $RefParser.JSONSchema = await refParser.dereference(String(route), page, {
            resolve,
            dereference: { circular: false }
          });
          normalisedRefs[route] = { ...page, ...resolved };
        } catch (e) {
          throw e;
        }
      }
      // Third pass, write out the files
      for (const route in normalisedRefs) {
        await mutableFilesystem.promises.writeFile(
          route,
          await serialiser.serialise(route, normalisedRefs[route])
        );
      }
    }
  },
  async $afterSource(pages: Page[], { config }) {
    for (const page of pages) {
      const refs = findKeys(page, '$ref');

      if (refs.length) {
        for (const ref of refs) {
          config.setRef(page.route, ...ref);
        }
      }
    }
    return pages;
  }
};

export default RefPlugin;

function createRefResolver(normalisedRefs, serialiser, mutableFilesystem) {
  return {
    file: {
      canRead: true,
      order: 1,
      async read(file, callback) {
        const refedPage =
          normalisedRefs[file.url] ||
          (await serialiser.deserialise(
            file.url,
            await mutableFilesystem.promises.readFile(file.url)
          ));
        try {
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
