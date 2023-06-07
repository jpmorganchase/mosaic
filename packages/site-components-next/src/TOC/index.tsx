import * as React from 'react';
import { loadPage } from '@jpmorganchase/mosaic-loaders';
import { TableOfContents as UI, type TOCItem } from '@jpmorganchase/mosaic-site-components';

export async function TableOfContents({
  path,
  fetcher,
  items
}: {
  path: string;
  fetcher: typeof loadPage;
  items?: TOCItem[];
}) {
  const { data } = await fetcher(path);
  const tableOfContents = data?.tableOfContents || [];
  return <UI items={items || tableOfContents} />;
}
