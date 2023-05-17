import { AppProps } from 'next/app';
import Head from 'next/head';
import { PT_Mono, Open_Sans } from 'next/font/google';
import {
  BaseUrlProvider,
  Image,
  Link,
  Metadata,
  components as mosaicComponents
} from '@jpmorganchase/mosaic-site-components';
import { ImageProvider, LinkProvider, ThemeProvider } from '@jpmorganchase/mosaic-components';
import { useCreateStore, StoreProvider } from '@jpmorganchase/mosaic-store';
import { LayoutProvider, layouts as mosaicLayouts } from '@jpmorganchase/mosaic-layouts';
import { themeClassName } from '@jpmorganchase/mosaic-theme';
import '@jpmorganchase/mosaic-site-preset-styles/index.css';
import { SessionProvider } from 'next-auth/react';
import classnames from 'clsx';

import { MyAppProps } from '../types/mosaic';

const ptMono = PT_Mono({
  weight: '400',
  display: 'swap',
  subsets: ['latin'],
  variable: '--salt-typography-fontFamily:'
});
const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--salt-typography-fontFamily-code',
  display: 'swap'
});

const components = mosaicComponents;
const layoutComponents = mosaicLayouts;

export default function MyApp({ Component, pageProps = {} }: AppProps<MyAppProps>) {
  const { searchIndex, searchConfig, sharedConfig, source } = pageProps;
  const frontmatter = source?.frontmatter || {};
  const storeProps = { sharedConfig, searchIndex, searchConfig, ...frontmatter };
  const createStore = useCreateStore(storeProps);
  return (
    <SessionProvider>
      <StoreProvider value={createStore()}>
        <Metadata Component={Head} />
        <ThemeProvider className={classnames(themeClassName, ptMono.variable, openSans.variable)}>
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
