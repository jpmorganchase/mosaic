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
import { load } from '@jpmorganchase/mosaic-site-mdx-loader';

import fontClassNames from './fonts';

export default async function Layout({ params: { slug }, children }) {
  const route = `/${slug.join('/')}`;
  const { data = {} } = await load(route);
  return (
    <SessionProvider>
      <StoreProvider value={data}>
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
