import { headers } from 'next/headers';
import { themeClassName } from '@jpmorganchase/mosaic-theme';
import { useStore, SiteState } from '@jpmorganchase/mosaic-store';
import { AppHeader } from '@jpmorganchase/mosaic-site-components';

import StoreInitializer from '../../components/StoreInitializer';
import { SessionProvider } from '../../components/SessionProvider';
import { getPage } from '../../utils/getPage';

const layouts = {
  default: ({ children }) => <div>FULLWIDTH{children}</div>,
  Landing: ({ children }) => (
    <div>
      <AppHeader />
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

  const { frontmatter } = await getPage(pathname);
  const state = frontmatter as SiteState;
  useStore.setState(state);

  const LayoutComponent = layouts['Landing'];
  return (
    <>
      <StoreInitializer state={state} />
      <section className={themeClassName}>
        <SessionProvider>
          <LayoutComponent>{children}</LayoutComponent>
        </SessionProvider>
      </section>
    </>
  );
}
