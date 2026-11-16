'use client';

/** Global session/theme providers and the separately seeded page content store. */
import { useLayoutEffect, useRef, useState } from 'react';
import { ImageProvider, LinkProvider, ThemeProvider } from '@jpmorganchase/mosaic-components';
import { LayoutProvider, layouts as mosaicLayouts } from '@jpmorganchase/mosaic-layouts';
import { BaseUrlProvider } from '@jpmorganchase/mosaic-site-components/BaseUrlProvider';
import { Image } from '@jpmorganchase/mosaic-site-components/Image/index';
import { Link } from '@jpmorganchase/mosaic-site-components/Link';
import {
  ColorModeProvider,
  initializeStore,
  reseedStore,
  StoreProvider
} from '@jpmorganchase/mosaic-store';
import { themeClassName } from '@jpmorganchase/mosaic-theme';
import { SessionProvider } from 'next-auth/react';
import { SearchProvider } from '@jpmorganchase/mosaic-site-components/SearchProvider';

export function Providers({
  authEnabled,
  searchMode = 'server',
  children
}: {
  /** Server-side `AUTH_ENABLED` from `src/auth.ts`, passed down by the root layout. */
  authEnabled: boolean;
  searchMode?: 'server' | 'browser';
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
  return (
    <SessionProvider session={authEnabled ? undefined : null}>
      <ColorModeProvider>
        <ThemeProvider themeClassName={themeClassName}>
          <SearchProvider mode={searchMode}>{children}</SearchProvider>
        </ThemeProvider>
      </ColorModeProvider>
    </SessionProvider>
  );
}

/**
 * Per-route shell. Creates a *new* Zustand store seeded with the
 * middleware-derived `storeProps` on first mount and keeps a stable
 * reference across re-renders. Theme preferences live in the root
 * ColorModeProvider and are unaffected by page data changes.
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
  const [store] = useState(() => initializeStore(storeProps));
  const seededWith = useRef(storeProps);
  useLayoutEffect(() => {
    if (seededWith.current === storeProps) return;
    seededWith.current = storeProps;
    reseedStore(store, storeProps);
  }, [store, storeProps]);
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
