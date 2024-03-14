import path from 'path';
import { reduce } from 'lodash-es';
import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import PluginError from './utils/PluginError.js';
import { createPageTest } from './utils/createPageTest.js';

const findKeys = (obj, targetProp, pathParts: string[] = []) =>
  reduce<string, { $$path: string[]; $$value: string }[]>(
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

interface TagPluginPage extends Page {
  tags?: string[];
}
interface TagPluginConfigData {
  tagRefs: { [key: string]: { $$path: string[]; $$value: string[] }[] };
  globalRefs: { [key: string]: { $$path: string[]; $$value: string[] }[] };
  subscribedTags: string[];
}

/**
 * Plugin that scrapes `$tag` from page metadata and also applies all aliases stored in `config.data.tags`.
 * Tags ultimately resolve down into refs, but are different from normal refs, in that they are applied to the
 * union filesystem (all merged filesystems), not to the individual source filesystem that they were defined on.
 * Other plugins can use `setData()` and modify the `tags` property, to apply new global refs, as long as
 * they do so before this plugin has reaches `$beforeSend`
 */
const $TagPlugin: PluginType<TagPluginPage, unknown, TagPluginConfigData> = {
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
  async $afterSource(pages, { config, ignorePages, pageExtensions }) {
    const isNonHiddenPage = createPageTest(ignorePages, pageExtensions);

    for (const page of pages) {
      try {
        if (!isNonHiddenPage(page.fullPath)) {
          continue;
        }
        const meta = page;
        // Symlink every `tag` item to '/.tags' folder
        if (meta.tags?.length) {
          config.setTags(page.fullPath, meta.tags);
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
              `${path.posix.join('/.tags', tag, '**', '*')}#${fragment}`
            );
          });
          config.setData({ subscribedTags: Array.from(tags) });
        }
      } catch (e) {
        throw new PluginError(e.message, page.fullPath);
      }
    }
    return pages;
  }
};

export default $TagPlugin;
