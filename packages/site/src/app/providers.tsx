'use client';

/**
 * Client-side providers for the App Router build.
 *
 * Split into two layers:
 *
 *   1. `<Providers>` — mounted by the root layout, persists across
 *      navigations. Carries the *global* state: NextAuth session, the
 *      colour-mode-bearing store (default-seeded; `persist` middleware
 *      hydrates `colorMode` from `localStorage`), and Salt's
 *      `ThemeProvider`.
 *
 *   2. `<StoreShell>` — mounted by each page, re-creates a *fresh*
 *      Zustand store seeded with the per-route loader output
 *      (`sharedConfig`, frontmatter, ...). React context resolves to
 *      the nearest provider, so nested consumers see the route-specific
 *      store while everything above (e.g. the layout's
 *      `ThemeProvider`) keeps reading from the global one.
 *
 * Why a fresh per-route store instead of `useCreateStore`?
 *   `useCreateStore` from `mosaic-store` keeps a module-level singleton
 *   on the client and patches its state from a `useLayoutEffect`. That
 *   pattern produces a hydration mismatch under the App Router: SSR
 *   renders the page-level store with the route seed, but the initial
 *   client render reads from the layout's default-seeded singleton —
 *   so `useAppHeader()` (and anything else driven by `sharedConfig`)
 *   returns `undefined` until the layout effect runs, which is too
 *   late for hydration. `initializeStore(seed)` returns a fully-
 *   populated store synchronously, matching SSR exactly.
 */
import { useState } from 'react';
import { ImageProvider, LinkProvider, ThemeProvider } from '@jpmorganchase/mosaic-components';
import { LayoutProvider, layouts as mosaicLayouts } from '@jpmorganchase/mosaic-layouts';
import { BaseUrlProvider } from '@jpmorganchase/mosaic-site-components/BaseUrlProvider';
import { Image } from '@jpmorganchase/mosaic-site-components/Image/index';
import { Link } from '@jpmorganchase/mosaic-site-components/Link';
import { initializeStore, StoreProvider, useCreateStore } from '@jpmorganchase/mosaic-store';
import { themeClassName } from '@jpmorganchase/mosaic-theme';
import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  // `<SessionProvider>` is rendered without a `session` prop so the
  // client fetches it lazily via `/api/auth/session` after mount. This
  // keeps the root layout independent of Auth.js configuration: a
  // missing `AUTH_SECRET` or OAuth env var degrades to `session: null`
  // on the client instead of crashing SSR (which would bypass
  // `error.tsx` and surface as Next's generic "A server error
  // occurred" fallback).
  //
  // The provider is mounted **unconditionally**. The `AUTH_ENABLED`
  // gate in `src/auth.ts` is a server-only build-time read of
  // `process.env.AUTH_SECRET` / `MOSAIC_AUTH_ENABLED`, neither of
  // which is a `NEXT_PUBLIC_` var — so on the client both resolve to
  // `undefined` and `AUTH_ENABLED` collapses to `false` regardless of
  // server config. That would leave `useSession()` callers
  // (`AppHeaderControls`, `RouteMetadata`, `Metadata`) without a
  // provider in the tree and throw `[next-auth]: useSession must be
  // wrapped in a <SessionProvider />`. On no-auth deployments the
  // server's stub handlers return 404 for `/api/auth/session`, which
  // `<SessionProvider>` reads as "no session" and settles to `null` —
  // cheap, and the only correct shape.
  //
  // Default-seeded store so the layout's `ThemeProvider`
  // (`useColorMode()`) always has a store in context — required even
  // for not-found and error renders. `useCreateStore({})` is fine
  // here because the layout-level store doesn't carry per-route data
  // that would cause a hydration mismatch.
  const createStore = useCreateStore({});
  return (
    <SessionProvider>
      <StoreProvider value={createStore()}>
        <ThemeProvider themeClassName={themeClassName}>{children}</ThemeProvider>
      </StoreProvider>
    </SessionProvider>
  );
}

/**
 * Per-route shell. Creates a *new* Zustand store seeded with the
 * middleware-derived `storeProps` on first mount and keeps a stable
 * reference across re-renders. The nested `<StoreProvider>` overrides
 * the layout's default store for everything inside this subtree.
 *
 * Note: this intentionally does *not* re-seed when `storeProps`
 * changes during the lifetime of a mounted page — App Router unmounts
 * and remounts the page subtree on every route change, so the
 * `useState` initializer runs fresh per navigation, which is the
 * behaviour we want.
 */
export function StoreShell({
  storeProps,
  children
}: {
  storeProps: Record<string, unknown>;
  children: React.ReactNode;
}) {
  const [store] = useState(() => initializeStore(storeProps));
  return (
    <StoreProvider value={store}>
      <BaseUrlProvider>
        <ImageProvider value={Image}>
          <LinkProvider value={Link}>
            <LayoutProvider layoutComponents={mosaicLayouts}>{children}</LayoutProvider>
          </LinkProvider>
        </ImageProvider>
      </BaseUrlProvider>
    </StoreProvider>
  );
}
