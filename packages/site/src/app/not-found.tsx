/**
 * Global 404.
 *
 * Next.js renders this component as part of *every* page response (it
 * is the root not-found boundary's fallback), not only when a page is
 * missing. So it does no data loading on the server: `<NotFoundBody>`
 * loads the header/footer data from the browser, and only when a 404 is
 * actually shown.
 *
 * The exception is a static export, which has no server to answer that
 * request. There this runs once at build time to bake the site-root
 * shared config (`getSharedConfig('/')`) and the search data into
 * `404.html`. If they are missing the page still renders, just without
 * a header.
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
