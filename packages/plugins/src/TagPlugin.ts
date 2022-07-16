import path from 'path';

import reduce from 'lodash/reduce';

import type PluginType from '@pull-docs/types/dist/Plugin';
import type Page from '@pull-docs/types/dist/Page';
import Meta from '@pull-docs/types/dist/Meta';
import $RefParser from '@apidevtools/json-schema-ref-parser';

import normaliseRefs from './utils/normaliseRefs';

/**
 * Plugin that scrapes `$tag` from page metadata and also applies all aliases stored in `config.data.tags`.
 * Tags ultimately resolve down into refs, but are different from normal refs, in that they are applied to the
 * union filesystem (all merged filesystems), not to the individual source filesystem that they were defined on.
 * Other plugins can use `setData()` and modify the `tags` property, to apply new global refs, as long as
 * they do so before this plugin has reaches `$beforeSend`
 */
const RefPlugin: PluginType<{
  tagRefs: { [key: string]: { $$path: string[]; $$value: string[] }[] };
  subscribedTags: string[];
}> = {
  // Check if the updated source has any /.tag aliases that we care about - if it does, we should re-run `afterUpdate` to
  // make sure we pull in the latest pages
  async shouldUpdate(updatedSourceFilesystem, { config }) {
    if (!config.data?.subscribedTags || !(await updatedSourceFilesystem.promises.exists('/.tags'))) {
      return false;
    }
    // Does the updated source have tags we are interested in?
    return ((await updatedSourceFilesystem.promises.readdir('/.tags')) as string[]).some(tag =>
      config.data.subscribedTags.includes(tag)
    );
  },
  // Apply and resolve $refs in place of anywhere we saw $tag
  async afterUpdate(mutableFilesystem, { globalFilesystem, serialiser, pageExtensions, config }) {
    if (!config.data?.tagRefs) {
      return;
    }
    const tagRefs = config.data?.tagRefs;
    const refParser = new $RefParser();
    for (const route in tagRefs) {
      const page: Page = await serialiser.deserialise(
        route,
        await globalFilesystem.promises.readFile(route)
      );
      if (tagRefs && tagRefs[page.route]) {
        try {
          const resolved: $RefParser.JSONSchema = await refParser.dereference(
            String(page.route),
            await normaliseRefs(page.route, tagRefs[page.route], globalFilesystem, pageExtensions),
            {
              resolve: createRefResolver(serialiser, globalFilesystem),
              dereference: { circular: false }
            }
          );

          await mutableFilesystem.promises.writeFile(
            route,
            await serialiser.serialise(route, { ...page, ...resolved } as any)
          );
        } catch (e) {
          throw e;
        }
      }
    }
  },
  // Every source with tags will create symlinks with the tagged pages, inside /.tags
  async $afterSource(pages: Page<{ tags?: string[] }>[]/*, nonPages: {}[]*/, { config }) {
    const tagRefs = {};
    const tags = [];
    const createRefs = tagDescriptor => {
      const [tag, fragment = ''] = tagDescriptor.$$value.split('#');

      if (!tag) {
        return tagDescriptor;
      }
      return { ...tagDescriptor, $$value: `${path.join('/.tags', tag, '**')}#${fragment}` };
    };
    for (const page of pages) {
      const meta = page as Meta<{ tags?: string[] }>;
      // Symlink every `tag` item to '/.tags' folder
      if (meta.tags?.length) {
        config.setAliases(
          page.route,
          meta.tags.map(tag => path.join('/.tags', tag, page.route))
        );
      }

      // Find any references to $tag
      const foundTags = findKeys(page, '$tag');
      tags.push(
        ...foundTags.map(tagRef => {
          const [tag] = tagRef.$$value.split('#');
          return tag;
        })
      );
      if (foundTags.length) {
        tagRefs[page.route] = foundTags.map(createRefs);
      }
    }
    config.setData({ tagRefs, subscribedTags: Array.from(new Set(tags)) });
    return pages;
  }
};

export default RefPlugin;

function createRefResolver(serialiser, globalFilesystem) {
  return {
    file: {
      canRead: true,
      order: 1,
      async read(file, callback) {
        const refedPage = await serialiser.deserialise(
          file.url,
          await globalFilesystem.promises.readFile(file.url)
        );
        try {
          return callback(null, refedPage as any);
        } catch (e) {
          return callback(e, null);
        }
      }
    }
  };
}

const findKeys = (obj, targetProp, pathParts: string[] = []) => {
  return reduce<string, { $$path: string[]; $$value: string }[]>(
    obj,
    (found, value, key) => {
      if (key === targetProp) {
        return found.concat({ $$path: pathParts.concat(String(key)), $$value: value });
      }
      if (typeof value === 'object') {
        const foundParents = findKeys(value, targetProp, pathParts.concat(String(key)));
        return found.concat(...foundParents);
      }
      return found;
    },
    []
  );
};
