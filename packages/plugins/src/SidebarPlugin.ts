import path from 'path';
import type { Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import { Page } from '@jpmorganchase/mosaic-types';

function createFileGlob(patterns, pageExtensions) {
  if (Array.isArray(patterns)) {
    return patterns.map(pattern => createFileGlob(pattern, pageExtensions));
  }
  if (pageExtensions.length === 1) {
    return `${patterns}${pageExtensions[0]}`;
  }
  return `${patterns}{${pageExtensions.join(',')}}`;
}
function isSubfolderIndex(page, dirName) {
  return page.fullPath.split('/').length === String(dirName).split('/').length + 2;
}

function sortFn(pageA, pageB, dirName) {
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

function filterFn(page) {
  return !(page.sidebar && page.sidebar.exclude);
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
      function setPageRefs(sidebarFilePath: string, page: SidebarPluginPage, i: number) {
        config.setRef(sidebarFilePath, ['pages', `${i}`, 'id', '$ref'], `${page.fullPath}#/route`);

        const label =
          page.sidebar && page.sidebar.label
            ? `${page.fullPath}#/sidebar/label`
            : `${page.fullPath}#/title`;

        config.setRef(sidebarFilePath, ['pages', `${i}`, 'name', '$ref'], label);

        config.setRef(
          sidebarFilePath,
          ['pages', `${i}`, 'data', 'link', '$ref'],
          `${page.fullPath}#/route`
        );
      }

      async function setChildPageRefs(page, dirName, i, sidebarFilePath) {
        if (isSubfolderIndex(page, dirName)) {
          const childDirName = path.posix.dirname(page.fullPath);
          const childNodeSidebarPath = path.posix.join(childDirName, options.filename);
          const childPages = (
            await Promise.all(
              (
                (await mutableFilesystem.promises.glob(
                  createFileGlob(['*', '*/index'], pageExtensions),
                  {
                    onlyFiles: true,
                    cwd: String(childDirName),
                    ignore: ignorePages.map(ignore => `**/${ignore}`)
                  }
                )) as string[]
              ).map(async pagePath => {
                const deserialisedPage = await serialiser.deserialise(
                  pagePath,
                  await mutableFilesystem.promises.readFile(pagePath)
                );
                return deserialisedPage;
              })
            )
          ).filter(filterPage => filterFn(filterPage));
          if (childPages.length > 1) {
            for (let j = 1; j < childPages.length; j++) {
              config.setRef(
                sidebarFilePath,
                ['pages', `${i}`, 'childNodes', `${j - 1}`, '$ref'],
                `${childNodeSidebarPath}#/pages/${j}`
              );
            }
          }
        }
      }

      function addSidebarDataToFrontmatter(page, dirName) {
        const dirNameLevels = String(dirName)
          .split('/')
          .filter(level => level);
        const sidebarRootDir = path.posix.join(
          '/',
          ...dirNameLevels.slice(0, dirNameLevels.length < 3 ? dirNameLevels.length : 3),
          '/'
        );

        config.setRef(
          String(page.fullPath),
          ['sidebarData', '$ref'],
          path.posix.join(String(sidebarRootDir), options.filename, '#', 'pages')
        );
      }

      const dirs = await mutableFilesystem.promises.glob('**', {
        onlyDirectories: true,
        cwd: '/'
      });
      for (const dirName of dirs) {
        const sidebarFilePath = path.posix.join(String(dirName), options.filename);
        const pages = (
          await Promise.all(
            (
              (await mutableFilesystem.promises.glob(
                createFileGlob(['*', '*/index'], pageExtensions),
                {
                  onlyFiles: true,
                  cwd: String(dirName),
                  ignore: ignorePages.map(ignore => `**/${ignore}`)
                }
              )) as string[]
            ).map(async pagePath => {
              const deserialisedPage = await serialiser.deserialise(
                pagePath,
                await mutableFilesystem.promises.readFile(pagePath)
              );
              return deserialisedPage;
            })
          )
        )
          .filter(page => filterFn(page))
          .sort((pageA, pageB) => sortFn(pageA, pageB, dirName));

        for (let i = 0; i < pages.length; i++) {
          setPageRefs(sidebarFilePath, pages[i], i);
          setChildPageRefs(pages[i], dirName, i, sidebarFilePath);
          addSidebarDataToFrontmatter(pages[i], dirName);
        }
        await mutableFilesystem.promises.writeFile(sidebarFilePath, '[]');
      }
    }
  };
export default SidebarPlugin;
