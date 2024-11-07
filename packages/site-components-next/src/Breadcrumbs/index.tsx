import { loadPage } from '@jpmorganchase/mosaic-loaders';
import { Breadcrumbs as UI } from '@jpmorganchase/mosaic-site-components';

export async function Breadcrumbs({ path, loader }: { path: string; loader: typeof loadPage }) {
  const { data } = await loader(path);
  const breadcrumbs = data?.breadcrumbs || [];
  return <UI breadcrumbs={breadcrumbs} enabled={breadcrumbs.length > 2} />;
}
