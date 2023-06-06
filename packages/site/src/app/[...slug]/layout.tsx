import { headers } from 'next/headers';
import { themeClassName } from '@jpmorganchase/mosaic-theme';
import { useStore, SiteState } from '@jpmorganchase/mosaic-store';

import StoreInitializer from '../../components/StoreInitializer';
import { SessionProvider } from '../../components/SessionProvider';
import { LayoutProvider } from '../../components/LayoutProvider';
import { getPage } from '../../utils/getPage';

export default async function Layout({ children }) {
  const pathname = headers().get('x-next-pathname') as string;
  if (!pathname) {
    return null;
  }

  const { frontmatter } = await getPage(pathname);
  const state = frontmatter as SiteState;
  useStore.setState(state);

  return (
    <>
      <StoreInitializer state={state} />
      <section className={themeClassName}>
        <SessionProvider>
          <LayoutProvider name={state.layout}>{children}</LayoutProvider>
        </SessionProvider>
      </section>
    </>
  );
}
