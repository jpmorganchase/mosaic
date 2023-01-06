import React from 'react';
import { SidebarProvider } from './SidebarProvider';
import { ThemeProvider } from '@jpmorganchase/mosaic-components';
import { useCreateStore, StoreProvider } from '@jpmorganchase/mosaic-store';

export const MosaicProvider = ({ storeProps, children }) => {
  const createStore = useCreateStore(storeProps);

  return (
    <StoreProvider value={createStore()}>
      <ThemeProvider>
        <SidebarProvider>{children}</SidebarProvider>
      </ThemeProvider>
    </StoreProvider>
  );
};
