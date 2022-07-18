import type Page from '@pull-docs/types/dist/Page';
import type PluginType from '@pull-docs/types/dist/Plugin';
import { escapeRegExp } from 'lodash';

/**
 * Plugin that creates aliases without the file extension for every page emitted by the source.
 * This allows pages to be retrieved from the filesystem without specifying `.mdx` (or whatever file extension is specified in `options.stripExt`).
 * The plugin also modifies the `friendlyRoute` to point to the shorter alias. Friendly routes are the shortest possible paths that
 * will point to the page (see `Page` docs)
 */
const PagesWithoutFileExtPlugin: PluginType<
  {}
> = {
  async $afterSource(pages: Page[], { config, pageExtensions }, options) {
    const pageTest = new RegExp(`${pageExtensions.map(escapeRegExp).join('|')}$`);

    for (const page of pages) {
      if (!pageTest.test(page.route)) {
        continue;
      }
      page.friendlyRoute = page.friendlyRoute.replace(pageTest, '');
      config.setAliases(page.route, [page.friendlyRoute]);
    }
    return pages;
  }
};

export default PagesWithoutFileExtPlugin;
