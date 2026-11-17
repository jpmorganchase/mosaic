import { createPageTest } from './utils/createPageTest.js';
import path from 'path';
import type { Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import { buildSidebarTree, type SidebarPage } from './sidebar.js';

import {
  isDataNode,
  isGroupNode,
  type SidebarData,
  type SidebarDataNode
} from './utils/sortSidebarData.js';

function createFileGlob(patterns, pageExtensions) {
  if (Array.isArray(patterns)) {
    return patterns.map(pattern => createFileGlob(pattern, pageExtensions));
  }
  // `**.mdx` only matches top-level files in tinyglobby; fast-glob treated it as `**/*.mdx`.
  const base = /^(\.\/)?\*\*$/.test(patterns) ? `${patterns}/*` : patterns;
  if (pageExtensions.length === 1) {
    return `${base}${pageExtensions[0]}`;
  }
  return `${base}{${pageExtensions.join(',')}}`;
}

interface SidebarPluginConfigData {
  dirs: string[];
  refs: { [key: string]: { $$path: (number | string)[]; $$value: string }[] };
}

export type SidebarPluginPage = SidebarPage;

export interface SidebarPluginOptions {
  /**
   * filename of the sidebar json, linked to each related page via ref
   */
  filename: string;
  /**
   * Glob pattern for matching directories which should be the root of the sidebar
   * * creates a root level sidebar containing all pages underneath root
   * *\/* creates a separate sidebar under each of the root directories
   */
  rootDirGlob: string;
}

/**
 * Sorts the pages in a folder by priority and then exports a JSON file with the
 * sidebar tree from that directory downwards and adds sidebar data into frontmatter for each page.
 *
 * Additionally, add to frontmatter
 * navigation -> prev -> { title, route }
 * navigation -> next -> { title, route }
 * to define the previous/next page in the page sequence, as defined by sidebar label and priority
 */
const SidebarPlugin: PluginType<SidebarPluginPage, SidebarPluginOptions, SidebarPluginConfigData> =
  {
    async $afterSource(pages, { ignorePages = [], pageExtensions = [] }) {
      for (const page of pages) {
        const isNonHiddenPage = createPageTest(ignorePages, pageExtensions);
        if (!isNonHiddenPage(page.fullPath)) {
          continue;
        }
        const sidebar = {
          label: page.title,
          groupLabel: page?.sidebar?.label || page.title,
          ...page?.sidebar
        };
        page.sidebar = sidebar;
      }
      return pages;
    },

    async $beforeSend(
      mutableFilesystem,
      { config, serialiser, ignorePages, pageExtensions },
      { filename = 'sidebar.json', rootDirGlob = '*' }
    ) {
      /**
       * Create a list of pages that should be used to build a sidebar.json
       * @param dirName - root path of sidebar
       */
      async function createPageList(rootDir) {
        const isChildOfRootDir = pagePath => {
          const pageDir = path.dirname(pagePath);
          return (
            pageDir === String(rootDir) ||
            pageDir.startsWith(`${String(rootDir).replace(/\/$/, '')}/`)
          );
        };
        const pagePaths = (await mutableFilesystem.promises.glob(
          createFileGlob(['**'], pageExtensions),
          {
            cwd: String(rootDir),
            ignore: ignorePages.map(ignore => `**/${ignore}`)
          }
        )) as string[];
        const filteredPagePaths = pagePaths.filter(isChildOfRootDir);
        const pageList = await Promise.all(
          filteredPagePaths.map(async pagePath => {
            return mutableFilesystem.promises.readFile(pagePath).then(serializedContent => {
              return serialiser.deserialise(pagePath, serializedContent);
            });
          })
        );
        return pageList;
      }

      /**
       * Link each page to a sidebar.json file via ref
       * @param pages - sidebar pages
       * @param dirName - root path of sidebar
       */
      function addSidebarDataToFrontmatter(pages, dirName) {
        pages.forEach(page => {
          config.setRef(
            String(page.fullPath),
            ['sidebarData', '$ref'],
            path.posix.join(dirName, filename, '#', 'pages')
          );
        });
      }

      const createNavigationRefs = (rootDir, currPage, prevPage, nextPage) => {
        if (prevPage) {
          config.setRef(currPage, ['navigation', 'prev', 'title', '$ref'], `${prevPage}#/title`);
          config.setRef(currPage, ['navigation', 'prev', 'route', '$ref'], `${prevPage}#/route`);
          const parentPath = path.posix.dirname(prevPage);
          if (parentPath !== rootDir) {
            config.setRef(
              currPage,
              ['navigation', 'prev', 'group', '$ref'],
              `${parentPath}#/sidebar/groupLabel`
            );
          }
        }
        if (nextPage) {
          config.setRef(currPage, ['navigation', 'next', 'title', '$ref'], `${nextPage}#/title`);
          config.setRef(currPage, ['navigation', 'next', 'route', '$ref'], `${nextPage}#/route`);
          const parentPath = path.posix.dirname(nextPage);
          if (parentPath !== rootDir) {
            config.setRef(
              currPage,
              ['navigation', 'next', 'group', '$ref'],
              `${parentPath}#/sidebar/groupLabel`
            );
          }
        }
      };

      function addNavigationToFrontmatter(pages, rootDir) {
        const getRelativeDataNode = (
          node: SidebarData,
          position: 'previous' | 'next'
        ): SidebarDataNode => {
          let targetNode = node;
          if (isGroupNode(node)) {
            targetNode = node.childNodes[position === 'previous' ? node.childNodes.length - 1 : 0];
          }
          return isGroupNode(targetNode) ? getRelativeDataNode(targetNode, position) : targetNode;
        };
        const isLastPage = page => {
          const lastPage = getRelativeDataNode(pages, 'previous');
          return page === lastPage;
        };

        const prevParentPage = [];
        const nextParentPage = [];
        function recursiveAddNavigation(pages) {
          let nextPage: SidebarDataNode, prevPage: SidebarDataNode;
          pages.forEach((page, pageIndex) => {
            if (isLastPage(page)) {
              nextPage = undefined;
            } else if (pageIndex === pages.length - 1) {
              nextPage = nextParentPage.pop();
            } else {
              nextPage = getRelativeDataNode(pages[pageIndex + 1], 'next');
            }
            if (pageIndex === 0) {
              prevPage = prevParentPage.pop();
            } else {
              prevPage = getRelativeDataNode(pages[pageIndex - 1], 'previous');
            }
            if (isDataNode(page)) {
              createNavigationRefs(rootDir, page.fullPath, prevPage?.fullPath, nextPage?.fullPath);
            } else {
              if (nextPage) {
                nextParentPage.push(nextPage);
              }
              if (prevPage) {
                prevParentPage.push(prevPage);
              }
              recursiveAddNavigation(page.childNodes);
            }
          });
        }
        recursiveAddNavigation(pages);
      }

      const rootUserJourneys = await mutableFilesystem.promises.glob(rootDirGlob, {
        onlyDirectories: true,
        cwd: '/'
      });

      await Promise.all(
        rootUserJourneys.map(async rootDir => {
          const sidebarFilePath = path.posix.join(String(rootDir), filename);
          const pages = await createPageList(rootDir);
          const sidebar = buildSidebarTree(pages, { rootDir: String(rootDir) });
          if (sidebar === undefined) {
            // The root group only exists when a page sits directly
            // in `rootDir`, so say which of the possible causes applies.
            const pagesInRootDir = pages.filter(
              page => path.posix.dirname(String(page.fullPath)) === String(rootDir)
            );
            let reason = 'it contains no pages';
            if (pages.length > 0 && pagesInRootDir.length === 0) {
              reason = 'no page sits directly in it; add an index page';
            }
            console.warn(
              `[Mosaic][Plugin-Sidebar] - Unable to create a Sidebar grouping for ${rootDir}: ${reason}`
            );
            return;
          }
          const sortedRootSidebar = [sidebar];
          if (isGroupNode(sortedRootSidebar[0])) {
            if (sortedRootSidebar[0].childNodes.length > 0) {
              addNavigationToFrontmatter(sortedRootSidebar, rootDir);
            }
            await mutableFilesystem.promises.writeFile(
              sidebarFilePath,
              JSON.stringify({ pages: sortedRootSidebar[0].childNodes })
            );
          } else {
            console.warn(`[Mosaic][Plugin-Sidebar] Unable to sort Sidebar grouping for ${rootDir}`);
          }
          addSidebarDataToFrontmatter(pages, rootDir);
        })
      );
    }
  };
export default SidebarPlugin;
