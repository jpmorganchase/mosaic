import React from 'react';
import { SidebarProvider } from './SidebarProvider';
import { ThemeProvider } from '@jpmorganchase/mosaic-components';
import { useCreateStore, StoreProvider } from '@jpmorganchase/mosaic-store';
import { LayoutProvider } from '@jpmorganchase/mosaic-layouts';
import { layouts as mosaicLayouts } from '@jpmorganchase/mosaic-layouts';

export const MosaicProvider = ({ storeProps, children }) => {
  const createStore = useCreateStore(storeProps);
  return (
    <StoreProvider value={createStore()}>
      <ThemeProvider>
        <SidebarProvider>
          <LayoutProvider layoutComponents={mosaicLayouts}>{children}</LayoutProvider>
        </SidebarProvider>
      </ThemeProvider>
    </StoreProvider>
  );
};
