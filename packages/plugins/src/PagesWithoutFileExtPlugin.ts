import type { Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import { escapeRegExp } from 'lodash-es';
import path from 'path';

function createPageTest(ignorePages, pageExtensions) {
  const extTest = new RegExp(`${pageExtensions.map(escapeRegExp).join('|')}$`);
  const ignoreTest = new RegExp(`${ignorePages.map(escapeRegExp).join('|')}$`);
  return file =>
    !ignoreTest.test(file) && extTest.test(file) && !path.basename(file).startsWith('.');
}

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
      if (!isNonHiddenPage(page.fullPath)) {
        continue;
      }
      page.route = page.route.replace(pageTest, '');
      config.setAliases(page.fullPath, [page.route]);
    }
    return pages;
  }
};

export default PagesWithoutFileExtPlugin;
