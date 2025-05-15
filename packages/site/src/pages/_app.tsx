import { ImageProvider, LinkProvider, ThemeProvider } from '@jpmorganchase/mosaic-components';
import { LayoutProvider, layouts as mosaicLayouts } from '@jpmorganchase/mosaic-layouts';
import {
  BaseUrlProvider,
  Image,
  Link,
  Metadata,
  components as mosaicComponents
} from '@jpmorganchase/mosaic-site-components';
import { Card, GridItem, GridLayout, StackLayout, SplitLayout, Text } from '@salt-ds/core';
import { Sitemap } from '@jpmorganchase/mosaic-sitemap-component';
import { StoreProvider, useCreateStore } from '@jpmorganchase/mosaic-store';
import { themeClassName } from '@jpmorganchase/mosaic-theme';
import { SessionProvider } from 'next-auth/react';
import type { AppProps } from 'next/app';
import { amplitude, openSans, ptMono } from '../fonts';
import Head from 'next/head';
import type { MyAppProps } from '../types/mosaic';
import classnames from 'clsx';

import '@jpmorganchase/mosaic-site-preset-styles/index.css';
import '@jpmorganchase/mosaic-sitemap-component/index.css';
import '../css/index.css';

const saltComponents = {
  Card,
  GridItem,
  GridLayout,
  StackLayout,
  SplitLayout,
  Text
};
const components = { ...mosaicComponents, Salt: saltComponents, Sitemap };
const layoutComponents = mosaicLayouts;

export default function MyApp({ Component, pageProps = {} }: AppProps<MyAppProps>) {
  const { searchIndex, searchConfig, sharedConfig, source } = pageProps;
  const frontmatter = source?.frontmatter || {};
  const storeProps = {
    sharedConfig,
    searchIndex,
    searchConfig,
    ...frontmatter
  };
  const createStore = useCreateStore(storeProps);
  return (
    <SessionProvider>
      <StoreProvider value={createStore()}>
        <Metadata Component={Head} />
        <ThemeProvider
          themeClassName={classnames(
            themeClassName,
            'salt-editorial',
            ptMono.variable,
            openSans.variable,
            amplitude.variable
          )}
        >
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
