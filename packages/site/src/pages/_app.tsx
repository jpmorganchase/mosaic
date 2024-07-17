import { ImageProvider, LinkProvider, ThemeProvider } from '@jpmorganchase/mosaic-components';
import { LayoutProvider, layouts as mosaicLayouts } from '@jpmorganchase/mosaic-layouts';
import {
  BaseUrlProvider,
  Image,
  Link,
  Metadata,
  components as mosaicComponents
} from '@jpmorganchase/mosaic-site-components';
import { Sitemap } from '@jpmorganchase/mosaic-sitemap-component';
import { StoreProvider, useCreateStore } from '@jpmorganchase/mosaic-store';
import { themeClassName } from '@jpmorganchase/mosaic-theme';
import classnames from 'clsx';
import { SessionProvider } from 'next-auth/react';
import type { AppProps } from 'next/app';
import { Open_Sans, PT_Mono } from 'next/font/google';
import Head from 'next/head';
import type { MyAppProps } from '../types/mosaic';

import '@jpmorganchase/mosaic-site-preset-styles/index.css';
import '@jpmorganchase/mosaic-sitemap-component/index.css';

const ptMono = PT_Mono({
  weight: '400',
  variable: '--salt-typography-fontFamily-ptMono',
  display: 'swap',
  subsets: ['latin']
});
const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--salt-typography-fontFamily-openSans',
  display: 'swap'
});

const components = { ...mosaicComponents, Sitemap };
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
          themeClassName={classnames(themeClassName, ptMono.variable, openSans.variable)}
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
