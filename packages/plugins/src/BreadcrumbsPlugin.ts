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
        const maxBreadcrumbCount = page.fullPath.split('/').length;

        while (currentPage !== undefined && breadcrumbs.length < maxBreadcrumbCount) {
          breadcrumbs.unshift({
            label: currentPage.title,
            path: currentPage.route,
            id: currentPage.fullPath
          });

          currentPage = pages.find(
            // eslint-disable-next-line @typescript-eslint/no-loop-func
            item => item.fullPath === path.posix.join(parentDir, options.indexPageName)
          );
          if (currentPage) {
            parentDir = path.posix.dirname(path.posix.join(String(currentPage.fullPath), '..'));
          }
        }

        if (!page.breadcrumbs) {
          // filter out any duplicate breadcrumbs
          const map = new Map(breadcrumbs.map(crumb => [crumb.id, crumb]));
          page.breadcrumbs = [...map.values()];
        }
      }
    }

    return pages;
  }
};

export default BreadcrumbsPlugin;
