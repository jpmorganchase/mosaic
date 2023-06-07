import { loadPage } from '@jpmorganchase/mosaic-loaders';
import { DocPaginator as UI } from '@jpmorganchase/mosaic-site-components';

export async function DocPaginator({
  path,
  loader,
  linkSuffix = 'Page'
}: {
  path: string;
  loader: typeof loadPage;
  linkSuffix: string;
}) {
  const { data } = await loader(path);
  const { next, prev } = data?.navigation || {};
  return <UI linkSuffix={linkSuffix} next={next} prev={prev} />;
}
