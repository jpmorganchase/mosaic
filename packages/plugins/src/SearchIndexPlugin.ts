import type {
  IVolumeMutable,
  Page,
  Plugin as PluginType,
  SearchRecordsFile
} from '@jpmorganchase/mosaic-types';
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

interface SearchIndexData {
  searchRecords?: Record<string, SearchRecord>;
}

function writeSearchRecords(
  filesystem: IVolumeMutable,
  searchRecords: NonNullable<SearchIndexData['searchRecords']>
) {
  const file: SearchRecordsFile = { version: 1, records: Object.values(searchRecords) };
  return filesystem.promises.writeFile(SEARCH_RECORDS_FILE, JSON.stringify(file));
}

/** Generates the records used by both server and browser search. */
const SearchIndexPlugin: PluginType<Page, SearchIndexPluginOptions, SearchIndexData> = {
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
        { ...page, fullPath: page.fullPath ?? pagePath } as Parameters<
          typeof buildSearchRecords
        >[0],
        recordOptions,
        pageExtensions
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
    const { searchRecords } = globalConfig.data;
    if (searchRecords) await writeSearchRecords(sharedFilesystem, searchRecords);
  },
  async afterSourceRemove(sharedFilesystem, { globalConfig }, options) {
    if (options?.records === false) return;
    const { searchRecords } = globalConfig.data;
    if (searchRecords) {
      await writeSearchRecords(sharedFilesystem, searchRecords);
      return;
    }
    try {
      await sharedFilesystem.promises.unlink(SEARCH_RECORDS_FILE);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
};

export default SearchIndexPlugin;
