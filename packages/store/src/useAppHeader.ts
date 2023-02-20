import { useStore } from './store';
import { MenuItemType } from './types';
import type {
  AppHeaderSlice,
  AppHeaderMenuLinkItem,
  AppHeaderMenuLinksItem,
  MenuLinkItem,
  MenuLinksItem
} from './types';

function isMenu(menu: MenuLinkItem | MenuLinksItem): menu is MenuLinksItem {
  return (menu as MenuLinksItem).links !== undefined;
}
function isMenuLink(menu: MenuLinkItem | MenuLinksItem): menu is MenuLinkItem {
  return (menu as MenuLinkItem).link !== undefined;
}

export type AppHeaderMenu = Array<AppHeaderMenuLinksItem | AppHeaderMenuLinkItem>;

export interface AppHeader extends Omit<AppHeaderSlice, 'menu'> {
  menu: AppHeaderMenu;
}

export function useAppHeader(): AppHeader | undefined {
  const appHeader = useStore(state => state.sharedConfig?.header);
  if (!appHeader) {
    return undefined;
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
    ...appHeader,
    menu: typedMenu
  };
}
