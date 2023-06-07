import { useContext } from 'react';
import { useStore as useZustandStore } from 'zustand';

import { SiteState } from './store';
import { StoreContext } from './StoreContext';

/**
 * Hook providing access to state stored in the site store
 */
export function useStore<T>(
  selector: (state: SiteState) => T,
  equalityFn?: (left: T, right: T) => boolean
): T {
  const storeFromContext = useContext(StoreContext);
  if (!storeFromContext) {
    throw new Error('Missing StoreProvider in the tree');
  }
  return useZustandStore(storeFromContext, selector, equalityFn);
}
