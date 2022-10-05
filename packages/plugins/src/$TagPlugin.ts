import path from 'path';

import reduce from 'lodash/reduce';
import escapeRegExp from 'lodash/escapeRegExp';

import type PluginType from '@jpmorganchase/mosaic-types/dist/Plugin';
import type Page from '@jpmorganchase/mosaic-types/dist/Page';
import type Meta from '@jpmorganchase/mosaic-types/dist/Meta';

/**
 * Plugin that scrapes `$tag` from page metadata and also applies all aliases stored in `config.data.tags`.
 * Tags ultimately resolve down into refs, but are different from normal refs, in that they are applied to the
 * union filesystem (all merged filesystems), not to the individual source filesystem that they were defined on.
 * Other plugins can use `setData()` and modify the `tags` property, to apply new global refs, as long as
 * they do so before this plugin has reaches `$beforeSend`
 */
const $TagPlugin: PluginType<{
  tagRefs: { [key: string]: { $$path: string[]; $$value: string[] }[] };
  globalRefs: { [key: string]: { $$path: string[]; $$value: string[] }[] };
  subscribedTags: string[];
}> = {
  // Check if the updated source has any /.tag aliases that we care about - if it does, we should re-run `afterUpdate` to
  // make sure we pull in the latest pages
  async shouldClearCache(updatedSourceFilesystem, { config }) {
    if (
      !config.data?.subscribedTags ||
      !(await updatedSourceFilesystem.promises.exists('/.tags'))
    ) {
      return false;
    }
    // Does the updated source have tags we are interested in?
    return ((await updatedSourceFilesystem.promises.readdir('/.tags')) as string[]).some(tag =>
      config.data.subscribedTags.includes(tag)
    );
  },
  // Every source with tags will create symlinks with the tagged pages, inside /.tags
  async $afterSource(pages: Page<{ tags?: string[] }>[], { config, ignorePages, pageExtensions }) {
    const isNonHiddenPage = createPageTest(ignorePages, pageExtensions);

    for (const page of pages) {
      if (!isNonHiddenPage(page.fullPath)) {
        continue;
      }
      const meta = page as Meta<{ tags?: string[] }>;
      // Symlink every `tag` item to '/.tags' folder
      if (meta.tags?.length) {
        config.setTags(page.fullPath, meta.tags);
        delete meta.tags;
      }

      // Find any references to $tag
      const foundTags = findKeys(page, '$tag');
      if (foundTags.length) {
        const tags = new Set<string>();

        foundTags.forEach(ref => {
          const [tag, fragment = ''] = ref.$$value.split('#');

          tags.add(tag);

          config.setGlobalRef(
            page.fullPath,
            ref.$$path,
            `${path.join('/.tags', tag, '**')}#${fragment}`
          );
        });
        config.setData({ subscribedTags: Array.from(tags) });
      }
    }
    return pages;
  }
};

export default $TagPlugin;

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

function createPageTest(ignorePages, pageExtensions) {
  const extTest = new RegExp(`${pageExtensions.map(escapeRegExp).join('|')}$`);
  const ignoreTest = new RegExp(`${ignorePages.map(escapeRegExp).join('|')}$`);
  return file => {
    return !ignoreTest.test(file) && extTest.test(file) && !path.basename(file).startsWith('.');
  };
}
