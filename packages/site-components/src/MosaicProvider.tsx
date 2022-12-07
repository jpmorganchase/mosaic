import React from 'react';
import Head from 'next/head';
import { BaseUrlProvider } from './BaseUrlProvider';
import { Image } from './Image';
import { Link } from './Link';
import { Metadata } from './Metadata';
import { SessionProvider } from './SessionProvider';
import { SidebarProvider } from './SidebarProvider';
import { ImageProvider, LinkProvider, ThemeProvider } from '@jpmorganchase/mosaic-components';
import { useCreateStore, StoreProvider } from '@jpmorganchase/mosaic-store';

export const MosaicProvider = ({ session, storeProps, children }) => {
  const createStore = useCreateStore(storeProps);
  return (
    <SessionProvider session={session}>
      <StoreProvider value={createStore()}>
        <Metadata Component={Head} />
        <ThemeProvider>
          <BaseUrlProvider>
            <ImageProvider value={Image}>
              <LinkProvider value={Link}>
                <SidebarProvider>{children}</SidebarProvider>
              </LinkProvider>
            </ImageProvider>
          </BaseUrlProvider>
        </ThemeProvider>
      </StoreProvider>
    </SessionProvider>
  );
};
