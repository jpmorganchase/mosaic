import classnames from 'clsx';
import { SessionProvider, ThemeProvider } from '@jpmorganchase/mosaic-site-components';
import {
  AppHeader,
  Breadcrumbs,
  Footer,
  DocPaginator,
  Sidebar,
  TableOfContents
} from '@jpmorganchase/mosaic-site-components-next';
import { themeClassName } from '@jpmorganchase/mosaic-theme';
import { loadPage, LoadPageError, LoaderData } from '@jpmorganchase/mosaic-loaders';
import { notFound } from 'next/navigation';
import { LayoutBase } from '@jpmorganchase/mosaic-layouts';
import fontClassNames from '../fonts';
import { View } from './View';

export default async function Layout({ params: { slug }, children }) {
  const route = `/${slug.join('/')}`;
  let metadata: LoaderData = {};
  try {
    const { data = {} } = await loadPage(route);
    metadata = data;
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
      <ThemeProvider themeClassName={classnames(themeClassName, ...fontClassNames)}>
        <LayoutBase Header={<AppHeader path={route} />}>
          <View
            layout={metadata.layout}
            FooterComponent={<Footer path={route} />}
            DocPaginatorComponent={
              <DocPaginator
                linkSuffix={metadata.layout === 'Newsletter' ? 'Post' : 'Page'}
                path={route}
                loader={loadPage}
              />
            }
            PrimarySidebarComponent={<Sidebar path={route} loader={loadPage} />}
            SecondarySidebarComponent={<TableOfContents path={route} loader={loadPage} />}
          >
            <Breadcrumbs path={route} loader={loadPage} />
            {children}
          </View>
        </LayoutBase>
      </ThemeProvider>
    </SessionProvider>
  );
}
