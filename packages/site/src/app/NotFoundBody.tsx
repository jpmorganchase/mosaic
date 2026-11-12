'use client';

/**
 * Client body of the 404 page: `<Page404>` inside the same store +
 * provider tree the regular pages use.
 *
 * Inside a namespace (`app/[namespace]/not-found.tsx`) the persistent
 * header comes from the namespace layout. The 404 restores that
 * fallback first, then looks up the requested section's config after
 * mounting. Outside a namespace
 * (`app/not-found.tsx`) the layout chrome comes from `<StoreShell>`'s
 * `<LayoutProvider>`, which defaults to `FullWidth`; static exports pass
 * the site-root shared config in as `initialChrome`.
 *
 * `<Page404>` reads context (image / link providers), so it has to live
 * in the client graph.
 */
import { Page404 } from '@jpmorganchase/mosaic-site-components/404';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { FrameSync } from './[namespace]/NamespaceFrame';
import type { loadNotFoundSharedConfig } from './[namespace]/notFoundChromeAction';
import { NotFoundRecovery } from './NotFoundRecovery';
import { StoreShell } from './providers';

const NO_CHROME: Record<string, unknown> = {};

// Dev-only: recover automatically from the 404s served while the Mosaic
// CLI is still loading content (see `NotFoundRecovery.tsx`).
const isDevelopment = process.env.NODE_ENV === 'development';

export function NotFoundBody({
  initialChrome = NO_CHROME,
  loadSharedConfigAction
}: {
  initialChrome?: Record<string, unknown>;
  loadSharedConfigAction?: typeof loadNotFoundSharedConfig;
}) {
  const pathname = usePathname();
  const [section, setSection] = useState<{
    route: string;
    sharedConfig: NonNullable<Awaited<ReturnType<typeof loadNotFoundSharedConfig>>>;
  }>();

  useEffect(() => {
    if (!loadSharedConfigAction || !pathname) return;
    let cancelled = false;
    void loadSharedConfigAction(pathname)
      .then(sharedConfig => {
        if (!cancelled && sharedConfig) setSection({ route: pathname, sharedConfig });
      })
      .catch(() => {
        // Keep the namespace fallback if the section config can't be loaded.
      });
    return () => {
      cancelled = true;
    };
  }, [loadSharedConfigAction, pathname]);

  const chrome = section?.route === pathname ? section : undefined;
  return (
    <StoreShell storeProps={chrome ?? initialChrome}>
      <FrameSync route={chrome?.route} sharedConfig={chrome?.sharedConfig} />
      <Page404 />
      {isDevelopment && <NotFoundRecovery />}
    </StoreShell>
  );
}
