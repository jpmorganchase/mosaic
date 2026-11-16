import { useLayoutEffect, createContext, useContext } from 'react';
import { createStore, StoreApi, useStore as useZustandStore } from 'zustand';
import { devtools } from 'zustand/middleware';

import type { BreadcrumbsSlice } from './types/breadcrumbs';
import type { SharedConfigSlice } from './types/sharedConfig';
import type { LayoutSlice } from './types/layout';
import type { NavigationSlice } from './types/navigation';
import type { SidebarSlice } from './types/sidebar';
import type { TableOfContentsSlice } from './types/tableOfContents';

let store: StoreApi<SiteState>;

export type SiteState = BreadcrumbsSlice &
  LayoutSlice &
  SidebarSlice &
  TableOfContentsSlice &
  NavigationSlice &
  SharedConfigSlice & {
    /** Commit timestamp */
    lastModified?: string;
    /** Page metadata description, used by search */
    description?: string;
    /** Page route */
    route?: string;
    /** Page title */
    title?: string;
  };

function getDefaultInitialState(): SiteState {
  return {
    breadcrumbs: [],
    sidebarData: [],
    tableOfContents: [],
    navigation: {},
    sharedConfig: {},
    description: undefined,
    layout: undefined,
    route: undefined,
    title: undefined
  };
}

const StoreContext = createContext<typeof store | undefined>(undefined);
StoreContext.displayName = 'StoreContext';
const StoreProvider = StoreContext.Provider;

/** Content stores have no persistence or global subscriptions. */
const initializeStore = (preloadedState: Partial<SiteState> = {}) =>
  createStore<SiteState>()(devtools(() => ({ ...getDefaultInitialState(), ...preloadedState })));

/** Replace page data after a refresh, resetting missing fields to their defaults. */
function reseedStore(mosaicStore: StoreApi<SiteState>, preloadedState: Partial<SiteState> = {}) {
  mosaicStore.setState({ ...getDefaultInitialState(), ...preloadedState }, true);
}

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

      store.setState(
        {
          ...store.getState(),
          ...pageState
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

export { useCreateStore, StoreProvider, useStore, initializeStore, reseedStore };
