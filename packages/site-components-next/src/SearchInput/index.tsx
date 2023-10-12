import * as React from 'react';

import { SearchInput as UI } from '@jpmorganchase/mosaic-site-components';
import { loadMosaicData } from '@jpmorganchase/mosaic-site-mdx-loader';
import { SearchConfig, SearchIndex } from '@jpmorganchase/mosaic-store';

export async function SearchInput() {
  const searchConfig = await loadMosaicData<SearchConfig>('search-config.json');
  const searchIndex = await loadMosaicData<SearchIndex>('search-data.json');

  return <UI searchConfig={searchConfig} searchIndex={searchIndex} />;
}
