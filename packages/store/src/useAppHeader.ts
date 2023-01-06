import { useStore } from './store';
import { MenuItemType } from './types';
import type {
  AppHeaderSlice,
  AppHeaderMenuLinkItem,
  AppHeaderMenuLinksItem,
  MenuLinkItem,
  MenuLinksItem,
  SearchIndexSlice
} from './types';

function isMenu(menu: MenuLinkItem | MenuLinksItem): menu is MenuLinksItem {
  return (menu as MenuLinksItem).links !== undefined;
}
function isMenuLink(menu: MenuLinkItem | MenuLinksItem): menu is MenuLinkItem {
  return (menu as MenuLinkItem).link !== undefined;
}

const parseSearchEndpoint = (searchNamespace: string): string | undefined => {
  if (!searchNamespace) return process.env.SEARCH_ENDPOINT;
  const endpoint = process.env[`SEARCH_ENDPOINT_${searchNamespace}`];
  return endpoint || '';
};

export type AppHeaderMenu = Array<AppHeaderMenuLinksItem | AppHeaderMenuLinkItem>;

export interface AppHeader extends Omit<AppHeaderSlice, 'searchNamespace | menu'> {
  HeaderControlsProps?: {
    searchEndpoint: string;
    searchIndex: SearchIndexSlice;
  };
  menu: AppHeaderMenu;
}

export function useAppHeader(): AppHeader | undefined {
  const appHeader = useStore(state => state.sharedConfig?.header);
  const allState = useStore(state => state);
  if (!appHeader) {
    return undefined;
  }
  let additionalProps = {};
  if (appHeader.searchNamespace) {
    additionalProps = {
      HeaderControlsProps: {
        searchEndpoint: parseSearchEndpoint(appHeader.searchNamespace),
        searchIndex: allState.searchIndex
      }
    };
  }
  const typedMenu: AppHeaderMenu = appHeader.menu.reduce<AppHeaderMenu>((result, menu) => {
    if (isMenu(menu)) {
      const linksItem: AppHeaderMenuLinksItem = { ...menu, type: MenuItemType.MENU };
      return [...result, linksItem];
    }
    if (isMenuLink(menu)) {
      const linkItem: AppHeaderMenuLinkItem = { ...menu, type: MenuItemType.LINK };
      return [...result, linkItem];
    }
    console.error('Unknown menu type passed to useAppHeader, ignoring', menu);
    return result;
  }, []);

  return {
    ...additionalProps,
    ...appHeader,
    menu: typedMenu
  };
}
