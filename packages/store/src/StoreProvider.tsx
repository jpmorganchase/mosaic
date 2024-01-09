import React, { useEffect, useRef } from 'react';

import { StoreContext } from './StoreContext';
import { InitialStoreState, createStore } from './store';

interface StoreProviderProps extends InitialStoreState {
  children?: React.ReactNode;
}

export const StoreProvider = ({ children, ...restProps }: StoreProviderProps) => {
  const storeRef = useRef<ReturnType<typeof createStore> | null>(null);
  if (!storeRef.current) {
    storeRef.current = createStore({ ...restProps });
  }

  useEffect(() => {
    storeRef.current?.persist.rehydrate();
  }, []);

  return <StoreContext.Provider value={storeRef.current}>{children}</StoreContext.Provider>;
};
