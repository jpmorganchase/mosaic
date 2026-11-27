import type { Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import {
  decodeRoutePathname,
  encodeRoutePathname,
  getPageExtension,
  isSourceRoute
} from '@jpmorganchase/mosaic-schemas/routePath';
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

    for (const page of pages) {
      try {
        if (!isNonHiddenPage(page.fullPath)) {
          continue;
        }
        const routeExtension = getPageExtension(page.route, pageExtensions);
        if (routeExtension) page.route = page.route.slice(0, -routeExtension.length);
        const fileExtension = getPageExtension(page.fullPath, pageExtensions);
        if (fileExtension?.includes('.', 1)) page.routeFileExtension = fileExtension;
        else delete page.routeFileExtension;
        // The filesystem lookup receives the URL's decoded path. Source
        // filenames that contain percent signs must keep them in the alias.
        const literal = isSourceRoute(page.route, page.fullPath, pageExtensions);
        const pathname = encodeRoutePathname(page.route, { literal, lowercase: !literal });
        const alias = decodeRoutePathname(pathname) ?? page.route;
        if (alias !== page.fullPath) config.setAliases(page.fullPath, [alias]);
      } catch (e) {
        throw new PluginError(e.message, page.fullPath);
      }
    }
    return pages;
  }
};

export default PagesWithoutFileExtPlugin;
