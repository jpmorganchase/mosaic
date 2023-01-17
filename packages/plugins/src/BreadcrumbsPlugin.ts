import path from 'path';
import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import { breadcrumbsLayoutSchema } from '@jpmorganchase/mosaic-schemas';

export type Breadcrumb = { label: string; path: string; id: string };

export interface BreadcrumbsPluginPage extends Page {
  breadcrumbs?: Array<Breadcrumb>;
  layout?: string;
}

interface BreadcrumbsPluginOptions {
  indexPageName: string;
}

/**
 * Calculates breadcrumbs for pages then embeds a `breadcrumbs` property to the metadata
 */
const BreadcrumbsPlugin: PluginType<BreadcrumbsPluginPage, BreadcrumbsPluginOptions> = {
  async $afterSource(pages, _, options) {
    for (const page of pages) {
      if (breadcrumbsLayoutSchema.safeParse(page?.layout).success) {
        const breadcrumbs: Array<Breadcrumb> = [];
        let currentPage = page;
        let parentDir = path.posix.normalize(path.posix.dirname(currentPage.fullPath));

        while (currentPage !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-loop-func
          if (breadcrumbs.findIndex(breadcrumb => breadcrumb.id === currentPage.fullPath) === -1) {
            breadcrumbs.unshift({
              label: currentPage.title,
              path: currentPage.route,
              id: currentPage.fullPath
            });
          }

          currentPage = pages.find(
            // eslint-disable-next-line @typescript-eslint/no-loop-func
            item => item.fullPath === path.posix.join(parentDir, options.indexPageName)
          );
          if (currentPage) {
            parentDir = path.posix.dirname(path.posix.join(String(currentPage.fullPath), '..'));
          }
        }

        if (!page.breadcrumbs) {
          page.breadcrumbs = breadcrumbs;
        }
      }
    }

    return pages;
  }
};

export default BreadcrumbsPlugin;
