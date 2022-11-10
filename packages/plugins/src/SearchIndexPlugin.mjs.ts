import path from 'path';
import { unified } from 'unified';
import markdown from 'remark-parse';
import remarkMdx from 'remark-mdx';
import { visit } from 'unist-util-visit';
import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';

interface SearchIndexPluginConfigData {
  searchIndices: Array<string[]>;
}

const SearchIndexPlugin: PluginType<
  Page,
  unknown,
  SearchIndexPluginConfigData,
  SearchIndexPluginConfigData
> = {
  async afterUpdate(mutableFilesystem, { sharedFilesystem, serialiser, ignorePages }) {
    const processor = unified().use(markdown).use(remarkMdx);

    const pages = await Promise.all(
      (
        (await mutableFilesystem.promises.glob('**', {
          onlyFiles: true,
          ignore: ignorePages.map(ignore => `**/${ignore}`),
          cwd: '/'
        })) as string[]
      )
        // .slice(20, 24)
        .map(async pagePath => {
          const deserialisedPage = await serialiser.deserialise(
            pagePath,
            await mutableFilesystem.promises.readFile(pagePath)
          );
          return deserialisedPage;
        })
    );

    const searchData = await Promise.all(
      pages.map(async page => {
        const sanitizedContent = page.content; //.replace(/<\/?[^>]+>/gi, '');
        const tree = await processor.parse(sanitizedContent);
        let textContent = '';

        visit(
          tree,
          node => node.type === 'text' || node.type === 'code',
          node => {
            textContent += ` ${node.value}`;
          }
        );

        console.log({ textContent });

        return {
          title: page.title,
          description: page.description,
          content: textContent
        };
      })
    );

    console.log({ searchData });
    // console.log({ pages: searchData.map(page => page.title) });
    // console.log({
    //   page: searchData[Math.floor(Math.random() * (searchData.length - 1))]
    // });
    await sharedFilesystem.promises.writeFile('/search-data.json', JSON.stringify(searchData));
    // .filter(page => filterFn(page))
    // .sort((pageA, pageB) => sortFn(pageA, pageB, dirName));
    // }

    // console.log({ pages });

    // const dirs = await mutableFilesystem.promises.glob('**', {
    //     onlyDirectories: true,
    //     cwd: '/'
    //   });

    //   for (const dirName of dirs) {
    //     const sidebarFilePath = path.posix.join(String(dirName), options.filename);
    //     const pages = (
    //       await Promise.all(
    //         (
    //           (await mutableFilesystem.promises.glob(
    //             createFileGlob(['*', '*/index'], pageExtensions),
    //             {
    //               onlyFiles: true,
    //               cwd: String(dirName),
    //               ignore: ignorePages.map(ignore => `**/${ignore}`)
    //             }
    //           )) as string[]
    //         ).map(async pagePath => {
    //           const deserialisedPage = await serialiser.deserialise(
    //             pagePath,
    //             await mutableFilesystem.promises.readFile(pagePath)
    //           );
    //           return deserialisedPage;
    //         })
    //       )
    //     )
    //       .filter(page => filterFn(page))
    //       .sort((pageA, pageB) => sortFn(pageA, pageB, dirName));

    //     for (let i = 0; i < pages.length; i++) {
    //       setPageRefs(sidebarFilePath, pages[i], i);
    //       setChildPageRefs(pages[i], dirName, i, sidebarFilePath);
    //       addSidebarDataToFrontmatter(pages[i], dirName);
    //     }

    // ---

    //     const searchIndex = await mutableFilesystem.promises.glob('**', {
    //       //   onlyFiles: true,
    //       ignore: ignorePages.map(ignore => `**/${ignore}`),
    //       cwd: '/'
    //     });

    //     console.log({ searchIndex });

    //     config.setData({
    //       searchIndices: [[]] as Array<string[]>
    //     });
  }
};

export default SearchIndexPlugin;
