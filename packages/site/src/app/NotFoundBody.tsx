'use client';

/**
 * Client body of the 404 page: `<Page404>` inside the same store +
 * provider tree the regular pages use.
 *
 * Inside a namespace (`app/[namespace]/not-found.tsx`) the persistent
 * header comes from the namespace layout, so the 404 needs no data of
 * its own; `<FrameSync />` puts the namespace's own header back in case
 * the previous page had overridden it. Outside a namespace
 * (`app/not-found.tsx`) the layout chrome comes from `<StoreShell>`'s
 * `<LayoutProvider>`, which defaults to `FullWidth`; static exports pass
 * the site-root shared config in as `initialChrome`.
 *
 * `<Page404>` reads context (image / link providers), so it has to live
 * in the client graph.
 */
import { Page404 } from '@jpmorganchase/mosaic-site-components/404';

import { FrameSync } from './[namespace]/NamespaceFrame';
import { NotFoundRecovery } from './NotFoundRecovery';
import { StoreShell } from './providers';

const NO_CHROME: Record<string, unknown> = {};

// Dev-only: recover automatically from the 404s served while the Mosaic
// CLI is still loading content (see `NotFoundRecovery.tsx`).
const isDevelopment = process.env.NODE_ENV === 'development';

export function NotFoundBody({
  initialChrome = NO_CHROME
}: {
  initialChrome?: Record<string, unknown>;
}) {
  return (
    <StoreShell storeProps={initialChrome}>
      <FrameSync />
      <Page404 />
      {isDevelopment && <NotFoundRecovery />}
    </StoreShell>
  );
}
