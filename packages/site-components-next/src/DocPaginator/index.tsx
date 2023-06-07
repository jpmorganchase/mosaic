import * as React from 'react';
import { loadPage } from '@jpmorganchase/mosaic-loaders';
import { DocPaginator as UI } from '@jpmorganchase/mosaic-site-components';

export async function DocPaginator({
  path,
  fetcher,
  linkSuffix = 'Page'
}: {
  path: string;
  fetcher: typeof loadPage;
  linkSuffix: string;
}) {
  const { data } = await fetcher(path);
  const { next, prev } = data?.navigation || {};
  return <UI linkSuffix={linkSuffix} next={next} prev={prev} />;
}
