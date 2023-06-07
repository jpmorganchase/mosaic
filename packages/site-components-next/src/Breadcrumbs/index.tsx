import * as React from 'react';
import { loadPage } from '@jpmorganchase/mosaic-loaders';
import { Breadcrumbs as UI } from '@jpmorganchase/mosaic-site-components';

export async function Breadcrumbs({ path, fetcher }: { path: string; fetcher: typeof loadPage }) {
  const { data } = await fetcher(path);
  const breadcrumbs = data?.breadcrumbs || [];
  return <UI breadcrumbs={breadcrumbs} enabled={breadcrumbs.length > 2} />;
}
