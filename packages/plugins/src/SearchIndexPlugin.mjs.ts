import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';

const SearchIndexPlugin: PluginType<Page> = {
  async afterUpdate(_, { sharedFilesystem }) {
    const searchData = {};
    await sharedFilesystem.promises.writeFile('/search-data.json', JSON.stringify(searchData));
  }
};

export default SearchIndexPlugin;
