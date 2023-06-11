import classnames from 'classnames';
import { headers } from 'next/headers';
import { PT_Mono, Open_Sans } from 'next/font/google';
import { themeClassName } from '@jpmorganchase/mosaic-theme';
import { BaseUrlProvider, ThemeProvider } from '@jpmorganchase/mosaic-site-components';

import StoreProvider from '../../components/StoreProvider';
import { Metadata } from '../../components/Metadata';
import { LinkProvider } from '../../components/LinkProvider';
import { ImageProvider } from '../../components/ImageProvider';
import { SessionProvider } from '../../components/SessionProvider';
import { LayoutProvider } from '../../components/LayoutProvider';
import { getPage } from '../../utils/getPage';

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

export default async function Layout({ children }) {
  const pathname = headers().get('x-next-pathname') as string;
  if (!pathname) {
    return null;
  }

  const { data } = await getPage(pathname);
  return (
    <SessionProvider>
      <StoreProvider value={data}>
        <Metadata />
        <BaseUrlProvider>
          <LinkProvider>
            <ThemeProvider
              className={classnames(themeClassName, ptMono.variable, openSans.variable)}
            >
              <ImageProvider>
                <LayoutProvider name={data.layout}>{children}</LayoutProvider>
              </ImageProvider>
            </ThemeProvider>
          </LinkProvider>
        </BaseUrlProvider>
      </StoreProvider>
    </SessionProvider>
  );
}
