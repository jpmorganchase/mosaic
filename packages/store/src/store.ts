import { create, StoreApi } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import type { BreadcrumbsSlice } from './types/breadcrumbs';
import type { SearchIndexSlice } from './types/searchIndex';
import type { SharedConfigSlice } from './types/sharedConfig';
import type { LayoutSlice } from './types/layout';
import type { NavigationSlice } from './types/navigation';
import type { SidebarSlice } from './types/sidebar';
import type { SourceSlice } from './types/source';
import type { TableOfContentsSlice } from './types/tableOfContents';
import type { ColorMode } from './types/colorMode';

export type SiteState = BreadcrumbsSlice &
  LayoutSlice &
  SidebarSlice &
  TableOfContentsSlice &
  NavigationSlice &
  SearchIndexSlice &
  SharedConfigSlice &
  SourceSlice & {
    /** Page metadata description, used by search */
    description?: string;
    /** Page route */
    route?: string;
    /** Page title */
    title?: string;
    colorMode: ColorMode;
    actions: {
      setColorMode: (colorMode: ColorMode) => void;
    };
  };

type PeristedStoreState = Pick<SiteState, 'colorMode'>;
type DefaultSiteState = Omit<SiteState, 'actions'>;

function getDefaultInitialState(): DefaultSiteState {
  return {
    source: undefined,
    breadcrumbs: [],
    sidebarData: [],
    tableOfContents: [],
    navigation: {},
    searchIndex: [],
    searchConfig: {},
    sharedConfig: {},
    description: undefined,
    layout: undefined,
    route: undefined,
    title: undefined,
    colorMode: 'light'
  };
}

const storeMiddlewares = stateCreatorFn =>
  devtools(
    persist<SiteState, [], [], PeristedStoreState>(stateCreatorFn, {
      name: 'mosaic-theme-pref',
      partialize: (state: SiteState) => ({
        colorMode: state.colorMode
      })
    })
  );

let useStore: StoreApi<SiteState> = create(
  storeMiddlewares(() => ({
    ...getDefaultInitialState()
  }))
);

export { useStore };
