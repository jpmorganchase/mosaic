import React from 'react';
import { SessionProvider } from './SessionProvider';
import { SidebarProvider } from './SidebarProvider';
import { ThemeProvider } from '@jpmorganchase/mosaic-components';
import { useCreateStore, StoreProvider } from '@jpmorganchase/mosaic-store';
import { LayoutProvider } from '@jpmorganchase/mosaic-layouts';

export const MosaicProvider = ({ storeProps, children, layoutComponents }) => {
  const createStore = useCreateStore(storeProps);

  return (
    <StoreProvider value={createStore()}>
      <ThemeProvider>
        <SidebarProvider>
          <LayoutProvider layoutComponents={layoutComponents}>{children}</LayoutProvider>
        </SidebarProvider>
      </ThemeProvider>
    </StoreProvider>
  );
};
