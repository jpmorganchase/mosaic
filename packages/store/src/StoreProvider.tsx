import React, { useRef } from 'react';
import type { StoreApi } from 'zustand';

import { StoreContext } from './StoreContext';
import { InitialSiteState, SiteState, createStore } from './store';

interface StoreProviderProps extends InitialSiteState {
  children?: React.ReactNode;
}

export const StoreProvider = ({ children, ...restProps }: StoreProviderProps) => {
  const storeRef = useRef<StoreApi<SiteState> | null>(null);
  if (!storeRef.current) {
    storeRef.current = createStore({ ...restProps });
  }
  return <StoreContext.Provider value={storeRef.current}>{children}</StoreContext.Provider>;
};
