import path from 'path';
import type { Plugin as PluginType, Page } from '@jpmorganchase/mosaic-types';
import { cloneDeep } from 'lodash-es';

// Which level does sidebar creation start
const sidebarRootLevel = 1;

function createFileGlob(patterns, pageExtensions) {
  if (Array.isArray(patterns)) {
    return patterns.map(pattern => createFileGlob(pattern, pageExtensions));
  }
  if (pageExtensions.length === 1) {
    return `${patterns}${pageExtensions[0]}`;
  }
  return `${patterns}{${pageExtensions.join(',')}}`;
}

function sortPagesByPriority(pageA, pageB, dirName) {
  // Always pin /index to the front
  const route = `${dirName}/index`;
  if (pageA.route === route) {
    return -1;
  }
  if (pageB.route === route) {
    return 1;
  }
  return (
    (pageB.sidebar && pageB.sidebar.priority ? pageB.sidebar.priority : -1) -
    (pageA.sidebar && pageA.sidebar.priority ? pageA.sidebar.priority : -1)
  );
}

function getPageLevel(page) {
  return page.route.split('/').length - 2;
}

function sortByPathLevel(pathA, pathB) {
  const pathALevel = pathA.split('/').length;
  const pathBLevel = pathB.split('/').length;
  return pathBLevel - pathALevel;
}

const filterPages = page => !(page.sidebar && page.sidebar.exclude);

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
  filename: string;
}

/**
 * Sorts the pages in a folder by priority and then exports a JSON file (name: `options.filename`) with the
 * sidebar tree from that directory downwards and adds sidebar data into frontmatter for each page.
 */
const SidebarPlugin: PluginType<SidebarPluginPage, SidebarPluginOptions, SidebarPluginConfigData> =
  {
    async $beforeSend(
      mutableFilesystem,
      { config, serialiser, ignorePages, pageExtensions },
      options
    ) {
      /**
       * Create a list of pages that should be used to build a sidebar.json
       * @param dirName - root path of sidebar
       */
      async function createPageList(dirName) {
        let pageList = await Promise.all(
          (
            (await mutableFilesystem.promises.glob(createFileGlob(['**'], pageExtensions), {
              cwd: String(dirName),
              ignore: ignorePages.map(ignore => `**/${ignore}`)
            })) as string[]
          ).map(
            async pagePath =>
              await serialiser.deserialise(
                pagePath,
                await mutableFilesystem.promises.readFile(pagePath)
              )
          )
        );
        pageList = pageList
          .filter(page => filterPages(page))
          .sort((pageA, pageB) => sortPagesByPriority(pageA, pageB, dirName));
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
            path.posix.join(dirName, options.filename, '#', 'pages')
          );
        });
      }

      const rootUserJourneys = await mutableFilesystem.promises.glob('**', {
        onlyDirectories: true,
        cwd: '/',
        deep: sidebarRootLevel
      });

      //Map into Sidebar Groups and sort children according to priority, priority = 1 has the highest priority
      function sortSidebarGroups(sidebarData) {
        const sortedGroupedPages = sidebarData.map(page => {
          if (page.childNodes) {
            const sortedPages = page.childNodes.sort((a, b) => b.priority - a.priority);
            return { ...page, childNodes: sortedPages };
          } else {
            page;
          }
        });
        return sortedGroupedPages;
      }

      await Promise.all(
        rootUserJourneys.map(async dirName => {
          const sidebarFilePath = path.posix.join(String(dirName), options.filename);
          const pages = await createPageList(dirName);
          const groupMap = createGroupMap(pages);
          const sidebarData = linkGroupMap(groupMap, dirName);
          const sidebarDataOrdered = sortSidebarGroups(sidebarData);
          await mutableFilesystem.promises.writeFile(
            sidebarFilePath,
            JSON.stringify({ pages: sidebarDataOrdered })
          );
          addSidebarDataToFrontmatter(pages, dirName);
        })
      );
    }
  };
export default SidebarPlugin;
