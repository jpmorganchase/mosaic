import path from 'node:path';
import { escapeRegExp } from 'lodash-es';
import type { Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import PluginError from './utils/PluginError.js';
import { SidebarPluginPage } from './SidebarPlugin.js';

const createPageTest = (ignorePages, pageExtensions) => {
  const extTest = new RegExp(`${pageExtensions.map(ext => escapeRegExp(ext)).join('|')}$`);
  const ignoreTest = new RegExp(`${ignorePages.map(ignore => escapeRegExp(ignore)).join('|')}$`);
  return file =>
    !ignoreTest.test(file) && extTest.test(file) && !path.basename(file).startsWith('.');
};

export type Breadcrumb = { label: string; path: string; id: string };

export interface BreadcrumbsPluginPage extends SidebarPluginPage {
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
  async $afterSource(pages, { ignorePages, pageExtensions }, options) {
    const isNonHiddenPage = createPageTest(ignorePages, pageExtensions);
    for (const page of pages) {
      if (!isNonHiddenPage(page.fullPath)) {
        continue;
      }
      try {
        const breadcrumbs: Array<Breadcrumb> = [];
        let currentPage = page;
        let parentDir = path.posix.normalize(path.posix.dirname(currentPage.fullPath));
        const maxBreadcrumbCount = page.fullPath.split('/').length;

        while (currentPage !== undefined && breadcrumbs.length < maxBreadcrumbCount) {
          breadcrumbs.unshift({
            label: currentPage.sidebar?.label || currentPage.title,
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
      } catch (e) {
        throw new PluginError(e.message, page.fullPath);
      }
    }

    return pages;
  },
  async afterUpdate(mutableFilesystem, { serialiser, globalFilesystem, ignorePages }, options) {
    const pages = (await mutableFilesystem.promises.glob('**', {
      onlyFiles: true,
      ignore: ignorePages.map(ignore => `**/${ignore}`),
      cwd: '/'
    })) as string[];

    if (pages.length > 0) {
      let updatedBreadcrumbs = [];
      const { breadcrumbs } = await serialiser.deserialise(
        pages[0],
        await mutableFilesystem.promises.readFile(pages[0])
      );

      // the root breadcrumb is the first breadcrumb for all pages in a source.  It is essentially the "first" page in a source
      const rootBreadcrumb = breadcrumbs?.[0] || undefined;

      if (rootBreadcrumb) {
        let parentDir = path.posix.join(path.posix.dirname(rootBreadcrumb.id), '../');

        while (parentDir !== '/') {
          const parentDirIndex = path.posix.join(parentDir, options.indexPageName);

          // check for this file in the global fs so we have a holistic view of all site pages
          if (await globalFilesystem.promises.exists(parentDirIndex)) {
            const { breadcrumbs: parentDirBreadcrumbs } = await serialiser.deserialise(
              rootBreadcrumb.id,
              await globalFilesystem.promises.readFile(parentDirIndex)
            );
            updatedBreadcrumbs = parentDirBreadcrumbs;
            break;
          }
          parentDir = path.posix.join(path.posix.dirname(parentDirIndex), '../');
        }

        if (updatedBreadcrumbs.length > 0) {
          for (const pagePath of pages) {
            const page = await serialiser.deserialise(
              pagePath,
              await mutableFilesystem.promises.readFile(pagePath)
            );

            // append the parent breadcrumbs **before** the current breadcrumbs
            page.breadcrumbs = [...updatedBreadcrumbs, ...page.breadcrumbs];
            await mutableFilesystem.promises.writeFile(
              pagePath,
              await serialiser.serialise(pagePath, page)
            );
          }
        }
      }
    }
  },
  async shouldUpdateNamespaceSources() {
    return true;
  }
};

export default BreadcrumbsPlugin;
