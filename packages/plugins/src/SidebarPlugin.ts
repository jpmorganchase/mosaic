import path from 'path';
import type { Plugin as PluginType, Page } from '@jpmorganchase/mosaic-types';
import { cloneDeep } from 'lodash-es';

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

interface SidebarPluginConfigData {
  dirs: string[];
  refs: { [key: string]: { $$path: (number | string)[]; $$value: string }[] };
}

interface SidebarPluginPage extends Page {
  sidebar?: {
    label?: string;
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
       * Group the pages into parent/child hierachy
       * @param pages - sidebar pages
       */
      function createGroupMap(pages) {
        return pages.reduce((result, page) => {
          const name = page.sidebar?.label || page.title;
          const priority = page.sidebar?.priority;
          const id = page.route;
          const isGroup = /\/index$/.test(page.route);
          const groupPath = path.posix.dirname(page.fullPath);
          const level = getPageLevel(page);
          const newChildNode = {
            id,
            fullPath: page.fullPath,
            name,
            priority,
            data: { level, link: page.route },
            childNodes: []
          };
          if (isGroup) {
            result[groupPath] = {
              ...newChildNode,
              ...result[groupPath]
            };
          } else {
            const childNodes = Object.prototype.hasOwnProperty.call(result, groupPath)
              ? result[groupPath].childNodes
              : [];
            result[groupPath] = {
              ...result[groupPath],
              childNodes: [...childNodes, newChildNode]
            };
          }
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

      const createNavigationRefs = (currPage, prevPage, nextPage) => {
        if (prevPage) {
          config.setRef(currPage, ['navigation', 'prev', 'title', '$ref'], `${prevPage}#/title`);
          config.setRef(currPage, ['navigation', 'prev', 'route', '$ref'], `${prevPage}#/route`);
        }
        if (nextPage) {
          config.setRef(currPage, ['navigation', 'next', 'title', '$ref'], `${nextPage}#/title`);
          config.setRef(currPage, ['navigation', 'next', 'route', '$ref'], `${nextPage}#/route`);
        }
      };

      function addNavigationToFrontmatter(pages) {
        let prevParentPage, nextParentPage;

        const getLastPage = pages => {
          if (pages[pages.length - 1].childNodes?.length) {
            return getLastPage(pages[pages.length - 1].childNodes);
          }
          return pages[pages.length - 1];
        };
        const lastPage = getLastPage(pages);
        const isFirstPage = page => page === pages[0];
        const isLastPage = page => page === lastPage;

        function recursiveAddNavigation(pages) {
          pages.forEach((page, pageIndex) => {
            const { fullPath: currPage } = page;
            let prevPage, nextPage;
            prevPage = prevParentPage;
            prevParentPage = isFirstPage(page) ? undefined : pages[pageIndex].fullPath;
            if (page.childNodes?.length) {
              nextPage = page.childNodes[0].fullPath;
              nextParentPage =
                pageIndex < pages.length - 1 ? pages[pageIndex + 1].fullPath : nextParentPage;
            } else if (pageIndex < pages.length - 1) {
              nextPage = pages[pageIndex + 1].fullPath;
            } else {
              nextPage = isLastPage(page) ? undefined : nextParentPage;
            }
            if (currPage !== undefined) {
              createNavigationRefs(currPage, prevPage, nextPage);
            } else if (currPage === undefined) {
              console.warn(
                '\x1b[31m',
                `** PAGE RETURNING UNDEFINED -  PLEASE CHECK THAT ALL YOUR DIR'S CONTAIN INDEX PAGES. THIS CAUSES ISSUES WITH SIDEBAR AND NAVIGATION **`
              );
            }
            recursiveAddNavigation(page.childNodes);
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

      function sortPagesByPriority(sidebarData) {
        const pagesByPriority = sidebarData.map(page => {
          if (page.childNodes.length > 1) {
            const pagesByPriority = page.childNodes.sort(
              (pageA, pageB) =>
                (pageB.priority ? pageB.priority : -1) - (pageA.priority ? pageA.priority : -1)
            );
            sortPagesByPriority(page.childNodes);
            return { ...page, childNodes: pagesByPriority };
          } else {
            return page;
          }
        });
        return pagesByPriority;
      }

      await Promise.all(
        rootUserJourneys.map(async rootDir => {
          const sidebarFilePath = path.posix.join(String(rootDir), filename);
          let pages = await createPageList(rootDir);
          pages = pages.filter(page => removeExcludedPages(page));
          const groupMap = createGroupMap(pages);
          const sidebarData = linkGroupMap(groupMap, rootDir);
          const pagesByPriority = sortPagesByPriority(sidebarData);
          addNavigationToFrontmatter(pagesByPriority);
          await mutableFilesystem.promises.writeFile(
            sidebarFilePath,
            JSON.stringify({ pages: pagesByPriority })
          );
          addSidebarDataToFrontmatter(pages, rootDir);
        })
      );
    }
  };
export default SidebarPlugin;
