/**
 * Global 404, for URLs outside a namespace and the static export's
 * `404.html`. Namespace 404s use `app/[namespace]/not-found.tsx`, which
 * renders inside the namespace layout with its header.
 *
 * Next.js renders this component as part of every page response (it is
 * the root not-found boundary's fallback), so it does no data loading on
 * the server. The exception is a static export: there this runs once at
 * build time to bake the site-root shared config (`getSharedConfig('/')`)
 * and the search data into `404.html`. If they are missing the page
 * still renders, just without a header.
 */
import {
  getSearchData,
  getSharedConfig,
  resolveMosaicMode
} from '@jpmorganchase/mosaic-site-middleware';

import { NotFoundBody } from './NotFoundBody';

const isStaticExport = process.env.MOSAIC_OUTPUT === 'export';

export default async function NotFound() {
  if (!isStaticExport) return <NotFoundBody />;

  const { mode, contentUrl } = resolveMosaicMode();
  const [sharedConfig, search] = await Promise.all([
    getSharedConfig('/', mode, contentUrl).catch(() => undefined),
    getSearchData(mode, contentUrl).catch(() => ({
      searchIndex: undefined,
      searchConfig: undefined
    }))
  ]);

  return (
    <NotFoundBody
      initialChrome={{
        sharedConfig,
        searchIndex: search.searchIndex,
        searchConfig: search.searchConfig
      }}
    />
  );
}
