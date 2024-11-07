import type {
  Breadcrumb,
  Navigation,
  SearchConfig,
  SearchIndex,
  SharedConfig,
  SidebarItem,
  TableOfContentsItem
} from '@jpmorganchase/mosaic-store';

export type SiteState = {
  /** Path described in breadcrumbs */
  breadcrumbs: Breadcrumb[];
  /** Page metadata description, used by search */
  description?: string;
  /** Page route */
  route?: string;
  /** Layout name that will define the page's anatomy */
  layout?: string;
  navigation?: Navigation;
  sharedConfig?: SharedConfig;
  /** Page title */
  title?: string;
  searchIndex?: SearchIndex;
  searchConfig?: SearchConfig;
  sidebarData: SidebarItem[];
  tableOfContents: TableOfContentsItem[];
};

export type LoaderSource = string;
export type LoaderData = Partial<SiteState>;
export type LoaderPage = {
  /** content source */
  source?: LoaderSource;
  /**  meta for content */
  data?: LoaderData;
};
