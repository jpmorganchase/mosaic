import { useLayoutEffect, createContext, useContext } from 'react';
import { createStore, StoreApi, useStore as useZustandStore } from 'zustand';

import { devtools } from 'zustand/middleware';

import type { BreadcrumbsSlice } from './types/breadcrumbs';
import type { SharedConfigSlice } from './types/sharedConfig';
import type { LayoutSlice } from './types/layout';
import type { SidebarSlice } from './types/sidebar';
import type { TableOfContentsSlice } from './types/tableOfContents';

let store: StoreApi<SiteState>;

export type SiteState = BreadcrumbsSlice &
  LayoutSlice &
  SidebarSlice &
  TableOfContentsSlice &
  SharedConfigSlice & {
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
    sharedConfig: {},
    description: undefined,
    layout: undefined,
    route: undefined,
    title: undefined
  };
}

const StoreContext = createContext<typeof store | undefined>(undefined);
const StoreProvider = StoreContext.Provider;

const initializeStore = (preloadedState: Partial<SiteState> = {}) =>
  createStore(
    devtools<SiteState>(() => ({
      ...getDefaultInitialState(),
      ...preloadedState
    }))
  );

function useCreateStore(serverInitialState: Partial<SiteState>, isSSR: boolean = false) {
  // Server side code: For SSR & SSG, always use a new store.
  if (typeof window === 'undefined' || isSSR) {
    return () => initializeStore(serverInitialState);
  }
  // End of server side code

  // Client side code:
  // Next.js always re-uses same store regardless of whether page is a SSR or SSG or CSR type.
  const isReusingStore = Boolean(store);
  store = store ?? initializeStore(serverInitialState);

  // When next.js re-renders _app while re-using an older store, then replace current state with
  // the new state (in the next render cycle).
  // (Why next render cycle? Because react cannot re-render while a render is already in progress.
  // i.e. we cannot do a setState() as that will initiate a re-render)
  //
  // eslint complaining "React Hooks must be called in the exact same order in every component render"
  // is ignorable as this code runs in same order in a given environment (i.e. client or server)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useLayoutEffect(() => {
    // serverInitialState is undefined for CSR pages. It is up to you if you want to reset
    // states on CSR page navigation or not. I have chosen not to, but if you choose to,
    // then add `serverInitialState = getDefaultInitialState()` here.
    if (serverInitialState && isReusingStore) {
      store.setState(
        {
          // re-use functions from existing store
          ...store.getState(),
          // but reset all other properties.
          ...serverInitialState
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
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('Missing StoreProvider in the tree');
  }
  return useZustandStore(store, selector, equalityFn);
}

export { useCreateStore, StoreProvider, useStore, initializeStore };
