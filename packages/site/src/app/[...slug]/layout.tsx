import classnames from 'clsx';
import {
  ImageProvider,
  LinkProvider,
  SessionProvider,
  ThemeProvider
} from '@jpmorganchase/mosaic-site-components';
import {
  AppHeader,
  Breadcrumbs,
  Footer,
  DocPaginator,
  Sidebar,
  TableOfContents
} from '@jpmorganchase/mosaic-site-components-next';
import { themeClassName } from '@jpmorganchase/mosaic-theme';
import { loadPage, LoadPageError, LoaderData } from '@jpmorganchase/mosaic-site-mdx-loader';
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
      <LinkProvider>
        <ThemeProvider className={classnames(themeClassName, ...fontClassNames)}>
          <ImageProvider>
            <LayoutBase Header={<AppHeader path={route} fetcher={loadPage} />}>
              <LayoutComponent
                FooterComponent={<Footer path={route} fetcher={loadPage} />}
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
          </ImageProvider>
        </ThemeProvider>
      </LinkProvider>
    </SessionProvider>
  );
}
