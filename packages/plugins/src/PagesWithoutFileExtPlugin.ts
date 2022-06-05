import type Page from '@pull-docs/types/dist/Page';
import type PluginType from '@pull-docs/types/dist/Plugin';
import { escapeRegExp } from 'lodash';

/**
 * Plugin that creates aliases for every page emitted by the source.
 * The aliases will simply be the route minus the file extension.
 * This allows pages to be retrieved from the filesystem without specifying `.mdx` (or whatever file extension is specified in `options.stripExt`).
 * The plugin also modifies the `friendlyRoute` to point to the shorter alias. Friendly routes are the shortest possible paths that
 * will point to the page (see `Page` docs)
 */
const PagesWithoutFileExtPlugin: PluginType<
  {},
  { stripExt?: string }
> = {
  async $afterSource(pages: Page[], { config }, options) {
    if (!options.stripExt) {
      return pages;
    }
    const stripExtRegExp = new RegExp(`${escapeRegExp(options.stripExt)}$`);
    for (const page of pages) {
      page.friendlyRoute = page.route.replace(stripExtRegExp, '');
      config.setAliases(page.route, [page.friendlyRoute]);
    }
    return pages;
  }
};

export default PagesWithoutFileExtPlugin;
