import type { Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import { escapeRegExp } from 'lodash-es';
import PluginError from './utils/PluginError.js';
import { createPageTest } from './utils/createPageTest.js';

/**
 * Plugin that creates aliases without the file extension for every page emitted by the source.
 * This allows pages to be retrieved from the filesystem without specifying `.mdx` (or whatever file extension is specified in `options.stripExt`).
 * The plugin also modifies the `route` to point to the shorter alias. Friendly fullPaths are the shortest possible paths that
 * will point to the page (see `Page` docs)
 */
const PagesWithoutFileExtPlugin: PluginType = {
  async $afterSource(pages, { config, ignorePages, pageExtensions }) {
    const isNonHiddenPage = createPageTest(ignorePages, pageExtensions);
    const pageTest = new RegExp(`${pageExtensions.map(escapeRegExp).join('|')}$`);

    for (const page of pages) {
      try {
        if (!isNonHiddenPage(page.fullPath)) {
          continue;
        }
        page.route = page.route.replace(pageTest, '');
        config.setAliases(page.fullPath, [page.route]);
      } catch (e) {
        throw new PluginError(e.message, page.fullPath);
      }
    }
    return pages;
  }
};

export default PagesWithoutFileExtPlugin;
