import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';

const SearchIndexPlugin: PluginType<Page> = {
  async afterUpdate(mutableFilesystem, { sharedFilesystem, serialiser, ignorePages }) {
    const pages = await Promise.all(
      (
        (await mutableFilesystem.promises.glob('**', {
          onlyFiles: true,
          ignore: ignorePages.map(ignore => `**/${ignore}`),
          cwd: '/'
        })) as string[]
      ).map(async pagePath => {
        const deserialisedPage = await serialiser.deserialise(
          pagePath,
          await mutableFilesystem.promises.readFile(pagePath)
        );
        return deserialisedPage;
      })
    );

    const searchData = pages.map(page => {
      return {
        title: page.title
      };
    });

    await sharedFilesystem.promises.writeFile('/search-data.json', JSON.stringify(searchData));
  }
};

export default SearchIndexPlugin;
