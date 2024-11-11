import { ReactNode } from 'react';
import { SearchInput as UI } from '@jpmorganchase/mosaic-site-components';
import { loadMosaicData } from '@jpmorganchase/mosaic-loaders';
import type { SearchConfig, SearchIndex } from '@jpmorganchase/mosaic-types';

export async function SearchInput(): Promise<ReactNode> {
  const [searchConfig, searchIndex] = await Promise.all([
    loadMosaicData<SearchConfig>('search-config.json'),
    loadMosaicData<SearchIndex>('search-data.json')
  ]);

  return <UI searchConfig={searchConfig} searchIndex={searchIndex} />;
}
