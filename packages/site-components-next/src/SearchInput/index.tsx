import * as React from 'react';

import { SearchInput as UI } from '@jpmorganchase/mosaic-site-components';
import { loadMosaicData } from '@jpmorganchase/mosaic-loaders';
import { SearchConfig, SearchIndex } from '@jpmorganchase/mosaic-types';

export async function SearchInput() {
  const [searchConfig, searchIndex] = await Promise.all([
    loadMosaicData<SearchConfig>('search-config.json'),
    loadMosaicData<SearchIndex>('search-data.json')
  ]);

  return <UI searchConfig={searchConfig} searchIndex={searchIndex} />;
}
