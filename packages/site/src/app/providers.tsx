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
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ImageProvider, LinkProvider, ThemeProvider } from '@jpmorganchase/mosaic-components';
import { LayoutProvider, layouts as mosaicLayouts } from '@jpmorganchase/mosaic-layouts';
import { BaseUrlProvider } from '@jpmorganchase/mosaic-site-components/BaseUrlProvider';
import { Image } from '@jpmorganchase/mosaic-site-components/Image/index';
import { Link } from '@jpmorganchase/mosaic-site-components/Link';
import {
  disposeStore,
  initializeStore,
  registerStore,
  reseedStore,
  StoreProvider,
  useCreateStore
} from '@jpmorganchase/mosaic-store';
import { themeClassName } from '@jpmorganchase/mosaic-theme';
import { SessionProvider } from 'next-auth/react';

export function Providers({
  authEnabled,
  children
}: {
  /** Server-side `AUTH_ENABLED` from `src/auth.ts`, passed down by the root layout. */
  authEnabled: boolean;
  children: React.ReactNode;
}) {
  // `<SessionProvider>` is mounted **unconditionally**, because
  // `useSession()` callers (`AppHeaderControls`, `RouteMetadata`,
  // `Metadata`) throw without one.
  //
  // With auth enabled it gets no `session` prop, so the client fetches
  // the session lazily via `/api/auth/session` after mount. This keeps
  // the root layout independent of Auth.js configuration: a missing
  // `AUTH_SECRET` or OAuth env var degrades to `session: null` on the
  // client instead of crashing SSR (which would bypass `error.tsx`).
  //
  // With auth disabled it gets `session={null}`: the provider treats
  // that as "already known, nobody is signed in" and never calls
  // `/api/auth/session`, saving a request on every page load. The flag
  // comes from the server because `AUTH_ENABLED` reads non-public env
  // vars that are `undefined` in the browser.
  //
  // Default-seeded store so the layout's `ThemeProvider`
  // (`useColorMode()`) always has a store in context — required even
  // for not-found and error renders. `useCreateStore({})` is fine
  // here because the layout-level store doesn't carry per-route data
  // that would cause a hydration mismatch.
  const createStore = useCreateStore({});
  return (
    <SessionProvider session={authEnabled ? undefined : null}>
      <StoreProvider value={createStore()}>
        <ThemeProvider themeClassName={themeClassName}>{children}</ThemeProvider>
      </StoreProvider>
    </SessionProvider>
  );
}

const NO_DEFAULTS: Record<string, unknown> = {};
const PageDataDefaultsContext = createContext<Record<string, unknown>>(NO_DEFAULTS);
PageDataDefaultsContext.displayName = 'PageDataDefaultsContext';

/**
 * Page data shared by every page below a layout (for example the sidebar
 * tree of a section). `<StoreShell>` seeds its store with these values
 * and lets the page's own `storeProps` override them, so a layout can
 * send the data once and pages can leave it out.
 */
export function PageDataDefaults({
  value,
  children
}: {
  value: Record<string, unknown>;
  children: React.ReactNode;
}) {
  return (
    <PageDataDefaultsContext.Provider value={value}>{children}</PageDataDefaultsContext.Provider>
  );
}

/**
 * Per-route shell. Creates a *new* Zustand store seeded with the
 * middleware-derived `storeProps` (on top of any `<PageDataDefaults>`
 * from an enclosing layout) on first mount and keeps a stable
 * reference across re-renders. The nested `<StoreProvider>` overrides
 * the layout's default store for everything inside this subtree.
 *
 * Navigating to another route remounts the page subtree, so the
 * `useState` initializer runs fresh per navigation. `router.refresh()`
 * (dev live reload, the 404 recovery) re-renders the page with new
 * server data *without* remounting it, so the store is re-seeded
 * whenever a new `storeProps` object arrives. The layout effect applies
 * it before paint, so store-driven UI (sidebar, table of contents,
 * breadcrumbs) never shows the old page next to the new body.
 *
 * `isEditing` is the server's view of `?edit=1` / `?new=1`. Passing it
 * to `LayoutProvider` keeps `useSearchParams()` out of the view path, so
 * prerendered pages ship their real layout in the HTML.
 */
export function StoreShell({
  storeProps,
  isEditing = false,
  children
}: {
  storeProps: Record<string, unknown>;
  isEditing?: boolean;
  children: React.ReactNode;
}) {
  const defaults = useContext(PageDataDefaultsContext);
  const [store] = useState(() => initializeStore({ ...defaults, ...storeProps }));
  const seededWith = useRef({ defaults, storeProps });
  useLayoutEffect(() => {
    const seeded = seededWith.current;
    if (seeded.defaults === defaults && seeded.storeProps === storeProps) return;
    seededWith.current = { defaults, storeProps };
    reseedStore(store, { ...defaults, ...storeProps });
  }, [store, defaults, storeProps]);
  // Registers the store for colour-mode sync while mounted and releases
  // it (listeners, sibling-store set) when the page unmounts. Re-registers
  // after React StrictMode's simulated unmount in development.
  useEffect(() => {
    registerStore(store);
    return () => disposeStore(store);
  }, [store]);
  return (
    <StoreProvider value={store}>
      <BaseUrlProvider>
        <ImageProvider value={Image}>
          <LinkProvider value={Link}>
            <LayoutProvider layoutComponents={mosaicLayouts} isEditing={isEditing}>
              {children}
            </LayoutProvider>
          </LinkProvider>
        </ImageProvider>
      </BaseUrlProvider>
    </StoreProvider>
  );
}
