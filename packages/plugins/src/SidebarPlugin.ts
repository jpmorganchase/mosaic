import path from 'path';
import type { Plugin as PluginType, Page } from '@jpmorganchase/mosaic-types';
import { sidebarSortConfigSchema, type SortConfig } from '@jpmorganchase/mosaic-schemas';
import { cloneDeep, escapeRegExp } from 'lodash-es';

import {
  isDataNode,
  isGroupNode,
  type SidebarData,
  type SidebarDataNode,
  type SidebarGroupNode,
  sortSidebarData
} from './utils/sortSidebarData.js';

function createFileGlob(patterns, pageExtensions) {
  if (Array.isArray(patterns)) {
    return patterns.map(pattern => createFileGlob(pattern, pageExtensions));
  }
  if (pageExtensions.length === 1) {
    return `${patterns}${pageExtensions[0]}`;
  }
  return `${patterns}{${pageExtensions.join(',')}}`;
}

function getPageLevel(page) {
  return page.route.split('/').length - 2;
}

function sortByPathLevel(pathA, pathB) {
  const pathALevel = pathA.split('/').length;
  const pathBLevel = pathB.split('/').length;
  return pathBLevel - pathALevel;
}

/**
 * Given the sharedSortConfig
 * 1. find the field specified by 'field' in the sort config
 * 2. transform the field value into the type specified by 'dataType'
 * @param page
 * @param sharedSortConfig
 * @returns transformed field value
 */
function getSortFieldData(page: SidebarPluginPage, sharedSortConfig?: SortConfig) {
  let fieldData: string | number | undefined;

  if (sharedSortConfig !== undefined) {
    const { field, dataType = 'string' } = sharedSortConfig;
    field
      .replace(/^(?:\.\.\/|\.\/)+/, '')
      .split('/')
      .forEach(part => {
        const source = fieldData === undefined ? page : fieldData;

        if (Object.prototype.hasOwnProperty.call(source, part)) {
          fieldData = source[part];
        }
      });

    switch (dataType) {
      case 'date':
        fieldData = new Date(fieldData).getTime(); // call getTime to convert to a number
        break;
      case 'string':
        fieldData = String(fieldData);
        break;
      case 'number':
        fieldData = Number(fieldData);
        break;
      default:
        fieldData = String(fieldData);
    }
  }

  return fieldData;
}

interface SidebarPluginConfigData {
  dirs: string[];
  refs: { [key: string]: { $$path: (number | string)[]; $$value: string }[] };
}

export interface SidebarPluginPage extends Page {
  sidebar?: {
    label?: string;
    groupLabel?: string;
  };
  sharedConfig: {
    sidebar: {
      sort: SortConfig;
    };
  };
}

interface SidebarPluginOptions {
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

const createPageTest = (ignorePages, pageExtensions) => {
  const extTest = new RegExp(`${pageExtensions.map(ext => escapeRegExp(ext)).join('|')}$`);
  const ignoreTest = new RegExp(`${ignorePages.map(ignore => escapeRegExp(ignore)).join('|')}$`);
  return file =>
    !ignoreTest.test(file) && extTest.test(file) && !path.basename(file).startsWith('.');
};

/**
 * Directories create groups of pages, the index file within that group is assigned GROUP_DEFAULT_PRIORITY
 * to ensure it comes first. This can be overriden by the metadata to move the position of the default page.
 */
const GROUP_DEFAULT_PRIORITY = 999;
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
        let sidebar = {
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
          return pageDir.indexOf(rootDir) === 0;
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
       * Group the pages into parent/child hierarchy
       * @param pages - sidebar pages
       */
      function createGroupMap(pages) {
        const sortConfigPages = {};
        return pages.reduce((result, page) => {
          const name = page.sidebar?.label || page.title;
          const sharedSortConfig = page?.sharedConfig?.sidebar?.sort;

          if (sharedSortConfig) {
            try {
              sidebarSortConfigSchema.parse(sharedSortConfig);
              sortConfigPages[`${path.posix.dirname(page.fullPath)}`] = sharedSortConfig;
            } catch (e) {
              /**
               * Don't throw a PluginError here as this will stop the sidebar being generated.
               * Plugins need a way to log errors/warnings without exceptions
               */
              console.error(
                `[Mosaic][Plugin-Sidebar] - Invalid sidebar sort config found in ${page.fullPath}`
              );
            }
          }

          const priority = page.sidebar?.priority;
          const isGroupDefaultPage = /\/index$/.test(page.route);
          const groupPath = path.posix.dirname(page.fullPath);

          let newChildNode: SidebarDataNode = {
            id: page.route,
            kind: 'data',
            fullPath: page.fullPath,
            name,
            priority: isGroupDefaultPage ? priority || GROUP_DEFAULT_PRIORITY : priority,
            data: { level: getPageLevel(page), link: page.route }
          };

          const currentChildNodes = Object.prototype.hasOwnProperty.call(result, groupPath)
            ? result[groupPath].childNodes
            : [];

          let newGroupNode: Partial<SidebarGroupNode> = {
            ...result[groupPath],
            id: path.posix.dirname(page.route),
            kind: 'group',
            childNodes: [...currentChildNodes, newChildNode]
          };

          if (isGroupDefaultPage) {
            newGroupNode = {
              ...newGroupNode,
              name: page.sidebar?.groupLabel || name,
              priority
            };
          }

          if (!isGroupDefaultPage && sortConfigPages[groupPath] !== undefined) {
            const fieldData = getSortFieldData(page, sortConfigPages[groupPath]);

            newChildNode.sharedSortConfig = {
              ...sortConfigPages[groupPath],
              fieldData
            };
          }

          result[groupPath] = newGroupNode;
          return result;
        }, {});
      }

      /**
       * Link the group map to their parents
       * @param groupMap - unlinked groups of pages
       * @param dirName - root path of sidebar
       */
      function linkGroupMap(groupMap, dirName) {
        const linkedGroupMap = cloneDeep(groupMap);
        const sortedGroupMapKeys = Object.keys(linkedGroupMap).sort(sortByPathLevel);
        sortedGroupMapKeys.forEach(groupPath => {
          let parentGroupPath = path.posix.dirname(groupPath);
          if (linkedGroupMap[parentGroupPath] === undefined) {
            return;
          }
          linkedGroupMap[parentGroupPath].childNodes = [
            ...linkedGroupMap[parentGroupPath].childNodes,
            linkedGroupMap[groupPath]
          ];
        });
        return [linkedGroupMap[dirName]];
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

        let prevParentPage = [];
        let nextParentPage = [];
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
        extglob: true,
        cwd: '/'
      });

      const removeExcludedPages = page => !(page.sidebar && page.sidebar.exclude);

      await Promise.all(
        rootUserJourneys.map(async rootDir => {
          const sidebarFilePath = path.posix.join(String(rootDir), filename);
          const pages = await createPageList(rootDir);
          const includedPages = pages.filter(page => removeExcludedPages(page));
          const groupMap = createGroupMap(includedPages);
          const sidebarData = linkGroupMap(groupMap, rootDir);
          if (sidebarData[0] === undefined) {
            console.warn(
              `[Mosaic][Plugin-Sidebar] - Unable to create a Sidebar grouping for ${rootDir}`
            );
            console.log(
              '[Mosaic][Plugin-Sidebar] - likely you have a directory without an index file'
            );
            return;
          }
          const sortedRootSidebar = sortSidebarData(sidebarData);
          addNavigationToFrontmatter(sortedRootSidebar, rootDir);
          if (isGroupNode(sortedRootSidebar[0])) {
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
