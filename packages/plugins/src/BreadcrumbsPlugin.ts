import path from 'path';
import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';

export type Breadcrumb = { label: string; path: string; id: string };

/**
 * Calculates breadcrumbs for pages then embeds a `breadcrumbs` property to the metadata
 */
const BreadcrumbsPlugin: PluginType<{}, { indexPageName: string }> = {
  async $afterSource(pages: Page[], {}, options) {
    for (const page of pages) {
      const breadcrumbs: Array<Breadcrumb> = [];
      let currentPage = page;   
      let parentDir = path.posix.dirname(currentPage.fullPath);

      while (currentPage !== undefined) {
        if (breadcrumbs.findIndex(breadcrumb => breadcrumb.id === currentPage.fullPath) === -1) {
          breadcrumbs.unshift({
            label: currentPage.title,
            path: currentPage.route,
            id: currentPage.fullPath


          });
        }

        currentPage = pages.find(
          page => page.fullPath === path.posix.join(parentDir, options.indexPageName)
        );
        if (currentPage) {
          parentDir = path.posix.dirname(path.posix.join(String(currentPage.fullPath), '..'));
        }
      }

      if (!page.breadcrumbs) {
        page.breadcrumbs = breadcrumbs;
      }
    }

    return pages;
  }
};

export default BreadcrumbsPlugin;
