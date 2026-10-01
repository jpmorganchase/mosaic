'use client';

/**
 * Client body of the 404 page: the global `<AppHeader>` and the rest of
 * the layout chrome around `<Page404>`, inside the same store + provider
 * tree the regular pages use.
 *
 * The header/footer data is loaded here, only when a 404 is actually on
 * screen (see `notFoundChromeAction.ts` for why it can't be loaded in
 * `not-found.tsx` on the server). Until it arrives the page renders
 * without a header; `<StoreShell>` re-seeds its store when the new
 * `storeProps` land. Static exports have no server to answer the
 * action, so `not-found.tsx` passes `initialChrome` loaded at build
 * time instead.
 *
 * The layout chrome (`<LayoutBase>` + `<AppHeader>`) comes from
 * `<StoreShell>`'s `<LayoutProvider>`, which defaults to `FullWidth`.
 * Mounting another `<LayoutBase>` here would double the header.
 * `<Page404>` reads context (image / link providers, `useRoute`,
 * `useAppHeader`), so it has to live in the client graph.
 */
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Page404 } from '@jpmorganchase/mosaic-site-components/404';

import { NotFoundRecovery } from './NotFoundRecovery';
import { loadNotFoundChrome } from './notFoundChromeAction';
import { StoreShell } from './providers';

const NO_CHROME: Record<string, unknown> = {};

// Dev-only: recover automatically from the 404s served while the Mosaic
// CLI is still loading content (see `NotFoundRecovery.tsx`).
const isDevelopment = process.env.NODE_ENV === 'development';

export function NotFoundBody({ initialChrome }: { initialChrome?: Record<string, unknown> }) {
  const pathname = usePathname();
  const [chrome, setChrome] = useState(initialChrome ?? NO_CHROME);

  useEffect(() => {
    if (initialChrome) return undefined;
    let cancelled = false;
    loadNotFoundChrome(pathname).then(
      loaded => {
        if (!cancelled) setChrome(loaded);
      },
      () => {
        // Keep the header-less 404; the page is still usable.
      }
    );
    return () => {
      cancelled = true;
    };
  }, [initialChrome, pathname]);

  return (
    <StoreShell storeProps={chrome}>
      <Page404 />
      {isDevelopment && <NotFoundRecovery />}
    </StoreShell>
  );
}
