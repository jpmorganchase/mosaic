/**
 * Global 404.
 *
 * Server-side: resolve the site-wide `sharedConfig` (header / footer /
 * search namespace) and search data so the not-found page can mount
 * the full `<AppHeader>` chrome users see on every other route. The
 * data loaders are the same `cache()`-deduped primitives the catch-all
 * uses, so this adds one parallel pair of fetches on a 404 and nothing
 * on a 200.
 *
 * `getSharedConfig('/', mode, contentUrl)` asks for the *root*
 * shared-config — the header/footer/menu for the homepage, which is
 * the only safe choice when we don't know which subtree the user was
 * trying to reach.
 *
 * The actual rendering — `<StoreShell>` → `<LayoutBase Header>` →
 * `<Page404 />` — runs in `NotFoundBody.tsx`, which is a client
 * boundary because `<AppHeader>` reads React context.
 *
 * If both loaders return `undefined` (env not wired up / snapshot
 * missing the root config), the page still renders cleanly — the
 * default-seeded store leaves the header empty rather than crashing.
 */
import {
  getSearchData,
  getSharedConfig,
  resolveMosaicMode
} from '@jpmorganchase/mosaic-site-middleware';

import { NotFoundBody } from './NotFoundBody';

export default async function NotFound() {
  const { mode, contentUrl } = resolveMosaicMode();
  const [sharedConfig, search] = await Promise.all([
    getSharedConfig('/', mode, contentUrl).catch(() => undefined),
    getSearchData(mode, contentUrl).catch(() => ({
      searchIndex: undefined,
      searchConfig: undefined
    }))
  ]);

  const storeProps = {
    sharedConfig,
    searchIndex: search?.searchIndex,
    searchConfig: search?.searchConfig
  };

  return <NotFoundBody storeProps={storeProps} />;
}
