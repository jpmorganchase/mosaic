// eslint-disable import/no-duplicates
import { AppProps } from 'next/app';
import Head from 'next/head';
import { BaseUrlProvider, Image, Link, Metadata } from '@jpmorganchase/mosaic-site-components';
import { ImageProvider, LinkProvider, ThemeProvider } from '@jpmorganchase/mosaic-components';
import { LayoutProvider } from '@jpmorganchase/mosaic-layouts';
import { useCreateStore, StoreProvider } from '@jpmorganchase/mosaic-store';
import { components as mosaicComponents } from '@jpmorganchase/mosaic-site-components';
import { layouts as mosaicLayouts } from '@jpmorganchase/mosaic-layouts';
import '@jpmorganchase/mosaic-site-preset-styles/index.css';
import { SessionProvider } from 'next-auth/react';

import { MyAppProps } from '../types/mosaic';

const components = mosaicComponents;
const layoutComponents = mosaicLayouts;

export default function MyApp({ Component, pageProps = {} }: AppProps<MyAppProps>) {
  const { searchIndex, sharedConfig, source } = pageProps;
  const frontmatter = source?.frontmatter || {};
  const storeProps = { sharedConfig, searchIndex, ...frontmatter };
  const createStore = useCreateStore(storeProps);
  return (
    <SessionProvider>
      <StoreProvider value={createStore()}>
        <Metadata Component={Head} />
        <ThemeProvider>
          <BaseUrlProvider>
            <ImageProvider value={Image}>
              <LinkProvider value={Link}>
                <LayoutProvider layoutComponents={layoutComponents}>
                  <Component components={components} {...pageProps} />
                </LayoutProvider>
              </LinkProvider>
            </ImageProvider>
          </BaseUrlProvider>
        </ThemeProvider>
      </StoreProvider>
    </SessionProvider>
  );
}
