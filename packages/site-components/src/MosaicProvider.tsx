import React from 'react';
import { Link } from './Link';
import { SidebarProvider } from './SidebarProvider';
import { LinkProvider, ThemeProvider } from '@jpmorganchase/mosaic-components';
import { useCreateStore, StoreProvider } from '@jpmorganchase/mosaic-store';

export const MosaicProvider = ({ storeProps, children }) => {
  const createStore = useCreateStore(storeProps);
  return (
    <StoreProvider value={createStore()}>
      <ThemeProvider>
        <LinkProvider value={Link}>
          <SidebarProvider>{children}</SidebarProvider>
        </LinkProvider>
      </ThemeProvider>
    </StoreProvider>
  );
};
