import type { Page, Plugin as PluginType, SearchRecordsFile } from '@jpmorganchase/mosaic-types';
import {
  buildSearchRecords,
  type SearchRecord,
  type SearchRecordOptions
} from './utils/searchRecords.js';

export type { SearchRecord, SearchRecordOptions, SearchRecordsFile };

export interface SearchIndexPluginOptions {
  /** Options for section-level search records. Set false to disable generation. */
  records?: SearchRecordOptions | false;
}

export const SEARCH_RECORDS_FILE = '/search-records.json';

/** Generates the records used by both server and browser search. */
const SearchIndexPlugin: PluginType<Page, SearchIndexPluginOptions> = {
  async $beforeSend(
    mutableFilesystem,
    { config, serialiser, ignorePages, pageExtensions },
    { records: recordOptions }
  ) {
    if (recordOptions === false) return;
    const pagePaths = (await mutableFilesystem.promises.glob('**', {
      onlyFiles: true,
      ignore: ignorePages.map(ignore => `**/${ignore}`),
      cwd: '/'
    })) as string[];
    const pages = await Promise.all(
      pagePaths.map(async pagePath =>
        serialiser.deserialise(pagePath, await mutableFilesystem.promises.readFile(pagePath))
      )
    );
    const searchRecords: Record<string, SearchRecord> = {};
    pagePaths.forEach((pagePath, index) => {
      const page = pages[index] as Page & { search?: { exclude?: boolean } };
      if (!pageExtensions.some(extension => pagePath.endsWith(extension))) return;
      if (typeof page.route !== 'string' || page.search?.exclude === true) return;
      const records = buildSearchRecords(
        page as Parameters<typeof buildSearchRecords>[0],
        recordOptions
      );
      if (!records) {
        console.warn(
          `[Mosaic][Plugin-SearchIndex] ${pagePath} is not valid MDX, so it is left out of search-records.json`
        );
        return;
      }
      for (const record of records) searchRecords[record.id] = record;
    });
    config.setData({ searchRecords });
  },
  async afterUpdate(_, { sharedFilesystem, globalConfig }) {
    if (!globalConfig.data.searchRecords) return;
    const file: SearchRecordsFile = {
      version: 1,
      records: Object.values(globalConfig.data.searchRecords) as SearchRecord[]
    };
    await sharedFilesystem.promises.writeFile(SEARCH_RECORDS_FILE, JSON.stringify(file));
  }
};

export default SearchIndexPlugin;
