import {
  SearchProvider,
  useSearchContext,
  type SearchContextValue
} from '@jpmorganchase/mosaic-site-components/SearchProvider';
import type {
  SearchIndexOptions,
  SearchOptions,
  SearchResult
} from '@jpmorganchase/mosaic-site-middleware/search';
import {
  buildSidebarTree,
  compareSidebarNodes,
  type SidebarPage
} from '@jpmorganchase/mosaic-plugins/sidebar';
import {
  ColorModeProvider,
  initializeStore,
  StoreProvider,
  useColorMode,
  useMosaicStore,
  useStoreActions
} from '@jpmorganchase/mosaic-store';
import {
  generateMosaicStaticParams,
  mapMosaicStaticParams,
  type SnapshotRoute
} from '@jpmorganchase/mosaic-site-middleware/routes';
import { CanonicalizeUrl, LiveReload } from '@jpmorganchase/mosaic-site-middleware/client';
import { buildMosaicMetadata } from '@jpmorganchase/mosaic-site-middleware/metadata';
import { createLiveReloadHandler } from '@jpmorganchase/mosaic-site-middleware/live-reload';
import { createRevalidateHandler } from '@jpmorganchase/mosaic-site-middleware/revalidate';
import type { MosaicAuthValue } from '@jpmorganchase/mosaic-site-components';
import { animation, type AnimationVariants } from '@jpmorganchase/mosaic-theme';

export const liveClient = (
  <>
    <CanonicalizeUrl canonical="/docs/index" />
    <LiveReload endpoint="/custom/live" onContentChanged={() => {}} />
  </>
);
export const liveHandler = createLiveReloadHandler({ isDevelopment: () => false });
export const revalidateHandler = createRevalidateHandler({ getSecret: () => ({}) });
export const missingMetadata = buildMosaicMetadata({
  kind: 'redirect',
  destination: '/docs/index'
});

const routes: SnapshotRoute[] = [{ pathname: '/salt', sourcePathname: '/salt/index.mdx' }];
export const staticParams = mapMosaicStaticParams(routes, { pageExtensions: ['.mdx'] });
export const generateParams = () => generateMosaicStaticParams({ pageExtensions: ['.mdx'] });

const animationOptions: AnimationVariants = { variant: 'leftSlideIn' };
export const animationClass = animation(animationOptions);
// @ts-expect-error Published recipe variants must still reject unknown values.
animation({ variant: 'unknown' });

export function SeededConsumer() {
  const store = useMosaicStore({ title: 'Synchronous seed' });
  return (
    <StoreProvider value={store}>
      <ThemeConsumer />
    </StoreProvider>
  );
}

export const noAuth: MosaicAuthValue = {
  status: 'unauthenticated',
  user: null,
  loginEnabled: false
};

function ThemeConsumer() {
  const mode = useColorMode();
  const { setColorMode } = useStoreActions();
  return <button onClick={() => setColorMode(mode === 'dark' ? 'light' : 'dark')}>{mode}</button>;
}

export const theme = (
  <ColorModeProvider>
    <StoreProvider value={initializeStore({ title: 'Page' })}>
      <ThemeConsumer />
    </StoreProvider>
  </ColorModeProvider>
);

const policies: SearchIndexOptions = {
  synonyms: [['colour', 'color']],
  groupBy: record => record.route.replace(/\/(usage|examples)$/, ''),
  pageRank: record => (record.route.endsWith('/usage') ? 0 : 1)
};

export const queryPolicies: SearchOptions = {
  groupBy: policies.groupBy,
  pageRank: policies.pageRank
};

function Consumer() {
  const context: SearchContextValue = useSearchContext();
  const results: Promise<SearchResult[]> = context.search('colour');
  void results;
  return null;
}

export const app = (
  <SearchProvider
    mode="browser"
    indexOptions={policies}
    queryOptions={{ limit: 20, sectionsPerResult: 0 }}
  >
    <Consumer />
  </SearchProvider>
);

interface ComponentPage extends SidebarPage {
  status?: string;
  groupPriority?: number;
}
const pages: ComponentPage[] = [{ fullPath: '/salt/index.mdx', status: 'Release Candidate' }];
export const tree = buildSidebarTree(pages, {
  rootDir: '/salt',
  transformPage: (node, page) => ({ ...node, metadata: { status: page.status } }),
  transformGroup: (node, { indexPage }) => ({
    ...node,
    priority: indexPage?.groupPriority,
    metadata: { status: indexPage?.status }
  }),
  compareNodes: (a, b) => compareSidebarNodes(a, b) || a.name.localeCompare(b.name)
});
