import { useLayoutEffect, createContext, useContext } from 'react';
import { createStore, StoreApi, useStore as useZustandStore } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import type { BreadcrumbsSlice } from './types/breadcrumbs';
import type { SearchIndexSlice } from './types/searchIndex';
import type { SharedConfigSlice } from './types/sharedConfig';
import type { LayoutSlice } from './types/layout';
import type { NavigationSlice } from './types/navigation';
import type { SidebarSlice } from './types/sidebar';
import type { TableOfContentsSlice } from './types/tableOfContents';
import type { ColorMode } from './types/colorMode';

let store: StoreApi<SiteState>;

export type SiteState = BreadcrumbsSlice &
  LayoutSlice &
  SidebarSlice &
  TableOfContentsSlice &
  NavigationSlice &
  SearchIndexSlice &
  SharedConfigSlice & {
    /** Commit timestamp */
    lastModified?: string;
    /** Page metadata description, used by search */
    description?: string;
    /** Page route */
    route?: string;
    /** Page title */
    title?: string;
    colorMode: ColorMode;
    actions: {
      setColorMode: (colorMode: ColorMode) => void;
    };
  };

type PeristedStoreState = Pick<SiteState, 'colorMode'>;
type DefaultSiteState = Omit<SiteState, 'actions'>;

function getDefaultInitialState(): DefaultSiteState {
  return {
    breadcrumbs: [],
    sidebarData: [],
    tableOfContents: [],
    navigation: {},
    searchIndex: [],
    searchConfig: {},
    sharedConfig: {},
    description: undefined,
    layout: undefined,
    route: undefined,
    title: undefined,
    colorMode: 'light'
  };
}

const StoreContext = createContext<typeof store | undefined>(undefined);
StoreContext.displayName = 'StoreContext';
const StoreProvider = StoreContext.Provider;

const storeMiddlewares = stateCreatorFn =>
  devtools(
    persist<SiteState, [], [], PeristedStoreState>(stateCreatorFn, {
      name: 'mosaic-theme-pref',
      partialize: (state: SiteState) => ({
        colorMode: state.colorMode
      })
    })
  );

/**
 * Mirror the active `colorMode` onto `document.documentElement` as a
 * `data-mode` attribute, so any CSS keyed off `[data-mode=dark]`
 * (notably global theme styles and the FOUC-prevention script in the
 * site's root layout) follows the user's preference immediately —
 * without a full page refresh.
 *
 * Lives at the module level so every store instance (layout-level and
 * per-route) drives the same attribute. The inline `<script>` in the
 * site's `<head>` sets the initial value from `localStorage` before
 * React hydrates; this function keeps it in sync from that point on.
 */
function syncColorModeToDom(colorMode: ColorMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-mode', colorMode);
}

/**
 * Cross-store same-tab sync for `colorMode`.
 *
 * The App Router site mounts two store instances (one at the layout
 * level for `<ThemeProvider>` / global state, one per route for
 * page-scoped seeds). They share persisted storage
 * (`localStorage.mosaic-theme-pref`) but not in-memory state, and the
 * browser does not fire `storage` events for same-tab writes — so a
 * `setColorMode` call on one store would not propagate to the other,
 * leaving Salt's `SaltProviderNext` and `<html data-mode>` out of sync
 * until a full page reload.
 *
 * Maintain a module-level set of every live store and broadcast every
 * `colorMode` change to all of them. Unsubscribe is best-effort —
 * stores live for the lifetime of the tab in practice, and zustand
 * does not expose a destroy hook on a per-store basis.
 */
const liveStores = new Set<StoreApi<SiteState>>();
function broadcastColorMode(colorMode: ColorMode, origin: StoreApi<SiteState>) {
  for (const store of liveStores) {
    if (store === origin) continue;
    if (store.getState().colorMode !== colorMode) {
      store.setState({ colorMode });
    }
  }
}

const initializeStore = (preloadedState: Partial<SiteState> = {}) => {
  const mosaicStore = createStore(
    storeMiddlewares(set => ({
      ...getDefaultInitialState(),
      ...preloadedState,
      actions: {
        setColorMode: (colorMode: ColorMode) => {
          set({ colorMode });
          syncColorModeToDom(colorMode);
        }
      }
    }))
  );

  if (typeof window !== 'undefined') {
    liveStores.add(mosaicStore);

    // Same-tab: when any store changes `colorMode`, broadcast to every
    // sibling store and mirror to `<html data-mode>`.
    mosaicStore.subscribe((state, prev) => {
      if (state.colorMode !== prev.colorMode) {
        syncColorModeToDom(state.colorMode);
        broadcastColorMode(state.colorMode, mosaicStore);
      }
    });

    // Cross-tab: the persist middleware writes `localStorage` on every
    // change; the matching read side is a `storage` event listener,
    // which fires only on *other* same-origin tabs/windows. Pick the
    // updated value back up and reflect it locally.
    const onStorage = (event: StorageEvent) => {
      if (event.key !== 'mosaic-theme-pref' || !event.newValue) return;
      try {
        const next = JSON.parse(event.newValue)?.state?.colorMode as ColorMode | undefined;
        if (!next || next === mosaicStore.getState().colorMode) return;
        mosaicStore.setState({ colorMode: next });
        // `setState` here will trip the subscriber above, which handles
        // the DOM mirror + same-tab broadcast.
      } catch {
        // ignore malformed payloads
      }
    };
    window.addEventListener('storage', onStorage);
  }

  return mosaicStore;
};

function useCreateStore(serverInitialState: Partial<SiteState>, isSSR = false) {
  // Server side code: For SSR & SSG, always use a new store.
  if (typeof window === 'undefined' || isSSR) {
    return () => initializeStore(serverInitialState);
  }
  // End of server side code

  // Client side code:
  // Next.js always re-uses same store regardless of whether page is a SSR or SSG or CSR type.
  const isReusingStore = Boolean(store);
  store = store ?? initializeStore(serverInitialState);

  // When the App Router re-renders the provider tree (the `app/providers.tsx`
  // layout boundary on a client-side route change) while re-using an older
  // store, replace current state with the new state (in the next render
  // cycle).
  // (Why next render cycle? Because react cannot re-render while a render is already in progress.
  // i.e. we cannot do a setState() as that will initiate a re-render)
  //
  // eslint complaining "React Hooks must be called in the exact same order in every component render"
  // is ignorable as this code runs in same order in a given environment (i.e. client or server)
  useLayoutEffect(() => {
    // serverInitialState is undefined for CSR pages. It is up to you if you want to reset
    // states on CSR page navigation or not. I have chosen not to, but if you choose to,
    // then add `serverInitialState = getDefaultInitialState()` here.
    if (serverInitialState && isReusingStore) {
      // recombine the page props with the initial state so that if page props are missing something then the default gets applied
      const pageState = { ...getDefaultInitialState(), ...serverInitialState };
      const { colorMode, actions, ...restStoreState } = store.getState();

      store.setState(
        {
          // re-use functions from existing store
          ...restStoreState,
          // but reset all other properties.
          ...pageState,
          colorMode,
          actions
        },
        true // replace states, rather than shallow merging
      );
    }
  });

  return () => store;
}

/**
 * Hook providing access to state stored in the site store
 */
function useStore<T>(
  selector: (state: SiteState) => T,
  equalityFn?: (left: T, right: T) => boolean
): T {
  const storeFromContext = useContext(StoreContext);
  if (!storeFromContext) {
    throw new Error('Missing StoreProvider in the tree');
  }
  return useZustandStore(storeFromContext, selector, equalityFn);
}

export { useCreateStore, StoreProvider, useStore, initializeStore };
