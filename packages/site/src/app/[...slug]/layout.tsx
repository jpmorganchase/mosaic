import { themeClassName } from '@jpmorganchase/mosaic-theme';
import { SiteState } from '@jpmorganchase/mosaic-store';
import '@jpmorganchase/mosaic-site-preset-styles/index.css';

import StoreInitializer from '../../components/StoreInitializer';
import { SessionProvider } from '../../components/SessionProvider';
import TestComponent from '../../components/TestComponent';

import { getPage } from '../../utils/getPage';
import { headers } from 'next/headers';

const layouts = {
  default: ({ children }) => <div>FULLWIDTH{children}</div>,
  Landing: ({ children }) => (
    <div>
      <TestComponent />
      {children}
    </div>
  ),
  DetailTechnical: ({ children }) => <div>DETAILTECHNICAL{children}</div>
};

export default async function Layout({ children }) {
  const pathname = headers().get('x-next-pathname') as string;
  if (!pathname) {
    return null;
  }
  const { source, frontmatter } = await getPage(pathname);
  const clientState = { ...frontmatter, source } as SiteState;

  const LayoutComponent = layouts['Landing'];
  return (
    <>
      <StoreInitializer state={clientState} />
      <section className={themeClassName}>
        <SessionProvider>
          <LayoutComponent>{children}</LayoutComponent>
        </SessionProvider>
      </section>
    </>
  );
}
