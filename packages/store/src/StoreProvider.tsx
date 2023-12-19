import React, { useRef } from 'react';
import type { StoreApi } from 'zustand';

import { StoreContext } from './StoreContext';
import { InitialStoreState, StoreState, createStore } from './store';

interface StoreProviderProps extends InitialStoreState {
  children?: React.ReactNode;
}

export const StoreProvider = ({ children, ...restProps }: StoreProviderProps) => {
  const storeRef = useRef<StoreApi<StoreState> | null>(null);
  if (!storeRef.current) {
    storeRef.current = createStore({ ...restProps });
  }
  return <StoreContext.Provider value={storeRef.current}>{children}</StoreContext.Provider>;
};
