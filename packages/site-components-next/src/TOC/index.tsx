import { loadPage } from '@jpmorganchase/mosaic-loaders';
import { TableOfContents as UI, type TOCItem } from '@jpmorganchase/mosaic-site-components';

export async function TableOfContents({
  path,
  loader,
  items
}: {
  path: string;
  loader: typeof loadPage;
  items?: TOCItem[];
}) {
  const { data } = await loader(path);
  const tableOfContents = data?.tableOfContents || [];
  return <UI items={items || tableOfContents} />;
}
