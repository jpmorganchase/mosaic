import path from 'path';
import type { Plugin as PluginType, Page } from '@jpmorganchase/mosaic-types';
import { sidebarDataLayoutSchema } from '@jpmorganchase/mosaic-schemas';
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
function getPageDepth(page) {
  return page.route.split('/').length - 2;
}

function sortByPathDepth(pathA, pathB) {
  const pathADepth = pathA.split('/').length;
  const pathBDepth = pathB.split('/').length;
  return pathBDepth - pathADepth;
}

function filterPages(page) {
  return (
    !(page.sidebar && page.sidebar.exclude) &&
    sidebarDataLayoutSchema.safeParse(page.layout).success
  );
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
          const id = page.route;
          const isGroup = /\/index$/.test(page.route);
          const groupPath = path.posix.dirname(page.fullPath);
          const depth = getPageDepth(page);
          const newChildNode = { id, name, data: { depth, link: page.route }, childNodes: [] };
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
        const sortedGroupMapKeys = Object.keys(linkedGroupMap).sort(sortByPathDepth);
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
        const rootDepth = dirName.split('/').length - 1;
        pages.forEach(page => {
          const pageDepth = getPageDepth(page);
          // set Ref for pages below root and not above root
          if (rootDepth >= pageDepth) {
            config.setRef(
              String(page.fullPath),
              ['sidebarData', '$ref'],
              path.posix.join(dirName, options.filename, '#', 'pages')
            );
          }
        });
      }

      const rootUserJourneys = await mutableFilesystem.promises.glob('**', {
        onlyDirectories: true,
        cwd: '/',
        deep: 2
      });

      rootUserJourneys.forEach(async dirName => {
        const sidebarFilePath = path.posix.join(String(dirName), options.filename);
        const pages = await createPageList(dirName);
        const groupMap = createGroupMap(pages);
        const sidebarData = linkGroupMap(groupMap, dirName);
        await mutableFilesystem.promises.writeFile(
          sidebarFilePath,
          JSON.stringify({ pages: sidebarData })
        );
        addSidebarDataToFrontmatter(pages, dirName);
      });
    }
  };
export default SidebarPlugin;
