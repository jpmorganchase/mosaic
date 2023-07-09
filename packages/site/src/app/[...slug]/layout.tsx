import classnames from 'classnames';
import {
  BaseUrlProvider,
  ImageProvider,
  LinkProvider,
  Metadata,
  SessionProvider,
  StoreProvider,
  ThemeProvider
} from '@jpmorganchase/mosaic-site-components';
import { LayoutProvider } from '@jpmorganchase/mosaic-layouts';
import { themeClassName } from '@jpmorganchase/mosaic-theme';
import { loadPage, LoadPageError } from '@jpmorganchase/mosaic-site-mdx-loader';
import { notFound } from 'next/navigation';

import fontClassNames from '../fonts';

export default async function Layout({ params: { slug }, children }) {
  const route = `/${slug.join('/')}`;
  let store = {};
  try {
    const { data = {} } = await loadPage(route);
    store = data;
  } catch (error) {
    const loadPageError = error as LoadPageError;
    if (loadPageError.statusCode === 404) {
      notFound();
    } else {
      throw error;
    }
  }
  return (
    <SessionProvider>
      <StoreProvider value={store}>
        <Metadata />
        <BaseUrlProvider>
          <LinkProvider>
            <ThemeProvider className={classnames(themeClassName, ...fontClassNames)}>
              <ImageProvider>
                <LayoutProvider>{children}</LayoutProvider>
              </ImageProvider>
            </ThemeProvider>
          </LinkProvider>
        </BaseUrlProvider>
      </StoreProvider>
    </SessionProvider>
  );
}
