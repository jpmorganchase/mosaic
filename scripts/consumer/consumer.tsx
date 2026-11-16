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
