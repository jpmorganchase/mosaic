'use client';

/**
 * Client wrapper for the 404 body so the global `<AppHeader>` (and the
 * rest of the layout chrome) renders inside the same store + provider
 * tree the regular pages use.
 *
 * The server-side `not-found.tsx` resolves `sharedConfig` + search data
 * (mirroring what `[...route]/page.tsx` passes to `<StoreShell>`),
 * hands them in as `storeProps`, and lets this component mount the
 * client subtree: `<StoreShell>` → `<Page404 />`. The layout chrome
 * (`<LayoutBase>` + `<AppHeader>`) is contributed by `<StoreShell>`'s
 * own `<LayoutProvider>`, which defaults to `FullWidth` — wrapping our
 * children in `<LayoutBase Header={<AppHeader/>}><LayoutFullWidth>…`.
 * Mounting another `<LayoutBase>` here would double the header.
 *
 * `<Page404>` itself reads context (image / link providers, `useRoute`,
 * `useAppHeader`), so it has to live in the client graph.
 */
import { Page404 } from '@jpmorganchase/mosaic-site-components/404';

import { StoreShell } from './providers';

export function NotFoundBody({ storeProps }: { storeProps: Record<string, unknown> }) {
  return (
    <StoreShell storeProps={storeProps}>
      <Page404 />
    </StoreShell>
  );
}
