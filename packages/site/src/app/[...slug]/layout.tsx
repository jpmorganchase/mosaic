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
import { LayoutBase, layouts } from '@jpmorganchase/mosaic-layouts';
import fontClassNames from '../fonts';

function getLayoutComponent(layout = 'FullWidth') {
  return layouts?.[layout];
}

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

  const LayoutComponent = getLayoutComponent(metadata.layout);

  return (
    <SessionProvider>
      <ThemeProvider className={classnames(themeClassName, ...fontClassNames)}>
        <LayoutBase Header={<AppHeader path={route} />}>
          <LayoutComponent
            FooterComponent={<Footer path={route} />}
            DocPaginatorComponent={
              <DocPaginator linkSuffix="Page" path={route} fetcher={loadPage} />
            }
            PrimarySidebarComponent={<Sidebar path={route} fetcher={loadPage} />}
            SecondarySidebarComponent={<TableOfContents path={route} fetcher={loadPage} />}
          >
            <Breadcrumbs path={route} fetcher={loadPage} />
            {children}
          </LayoutComponent>
        </LayoutBase>
      </ThemeProvider>
    </SessionProvider>
  );
}
