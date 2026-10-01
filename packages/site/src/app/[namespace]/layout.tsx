/**
 * Namespace layout (`/mosaic/...`).
 *
 * Next.js keeps this layout mounted while the reader navigates within
 * the namespace, so it loads the data shared by every page of the
 * namespace once — its shared config (header, footer, menus,
 * writability) and the site search index — and renders the persistent
 * header through `<NamespaceFrame>`. Pages load only their own content.
 *
 * In active mode these reads hit the content server on full page loads
 * and refreshes only; client-side navigation within the namespace
 * doesn't re-run this layout.
 */
import {
  getSearchData,
  getSharedConfig,
  resolveMosaicMode
} from '@jpmorganchase/mosaic-site-middleware';

import { withCapabilityBypass } from '../../lib/capabilities';
import { NamespaceFrame } from './NamespaceFrame';

export default async function NamespaceLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ namespace: string }>;
}) {
  const { namespace } = await params;
  const { mode, contentUrl } = resolveMosaicMode();
  // `getSharedConfig` reads the config of a page's folder, so ask for a
  // page directly in the namespace folder.
  const [sharedConfig, search] = await Promise.all([
    getSharedConfig(`/${namespace}/index`, mode, contentUrl).catch(() => undefined),
    getSearchData(mode, contentUrl).catch(() => ({
      searchIndex: undefined,
      searchConfig: undefined
    }))
  ]);

  return (
    <NamespaceFrame
      data={{
        sharedConfig: withCapabilityBypass(sharedConfig),
        searchIndex: search.searchIndex,
        searchConfig: search.searchConfig
      }}
    >
      {children}
    </NamespaceFrame>
  );
}
