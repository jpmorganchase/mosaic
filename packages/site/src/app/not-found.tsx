import classnames from 'classnames';
import {
  ImageProvider,
  SessionProvider,
  StoreProvider,
  ThemeProvider
} from '@jpmorganchase/mosaic-site-components';
import { themeClassName } from '@jpmorganchase/mosaic-theme';
import { loadPage } from '@jpmorganchase/mosaic-site-mdx-loader';
import { Page404 } from '@jpmorganchase/mosaic-site-components';
import fontClassNames from './fonts';

export default async function NotFound() {
  const { data = {} } = await loadPage('/mosaic/index');
  return (
    <SessionProvider>
      <StoreProvider value={data}>
        <ThemeProvider className={classnames(themeClassName, ...fontClassNames)}>
          <ImageProvider>
            <Page404
              description="This page does not exist, check the URL"
              links={[{ url: '/mosaic', label: 'Return to Homepage' }]}
            />
          </ImageProvider>
        </ThemeProvider>
      </StoreProvider>
    </SessionProvider>
  );
}
