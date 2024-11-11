import { Suspense } from 'react';
import { loadSharedConfig } from '@jpmorganchase/mosaic-loaders';
import { AppHeader as UI } from '@jpmorganchase/mosaic-site-components';
import { TabsLinkItem, TabsMenu, TabsMenuButtonItem } from '@jpmorganchase/mosaic-components';
import { SearchInput } from '../SearchInput';

/**
 *  [[`MenuItemType`]] defines the type of App header Menu items
 */
export type MenuItemType = 'menu' | 'link';

function isMenu(menu: MenuLinkItem | MenuLinksItem): menu is MenuLinksItem {
  return (menu as MenuLinksItem).links !== undefined;
}
function isMenuLink(menu: MenuLinkItem | MenuLinksItem): menu is MenuLinkItem {
  return (menu as MenuLinkItem).link !== undefined;
}

/**
 *  [[`Menu`]] defines App Header menus
 */
export type Menu = MenuLinksItem | MenuLinkItem;

/**
 *  [[`MenuLinksItem`]] defines a menu of links
 */
export interface MenuLinksItem {
  /** Collection of link options */
  links: MenuLinkItem[];
  /** Title of MenuLinksItem */
  title: string;
  /** Type of MenuLinksItem */
  type: 'menu';
}

/**
 *  [[`MenuLinksItem`]] defines a menu of links and includes a type
 */
export interface AppHeaderMenuLinksItem {
  /** Collection of link options */
  links: MenuLinkItem[];
  /** Title of Tab */
  title: string;
  /** Type of Tab */
  type: 'menu';
}

/**
 *  [[`MenuLinkItem`]] define a menu link
 */
export interface MenuLinkItem {
  /** URL linked by Tab */
  link: string;
  /** Title of Tab */
  title?: string;
  /** Type of MenuLinkItem */
  type: 'link';
}

/**
 *  [[`MenuLinkItem`]] define a menu link and include a type
 */
export interface AppHeaderMenuLinkItem {
  /** URL linked by Tab */
  link: string;
  /** Title of Tab */
  title?: string;
  /** Type of Tab */
  type: 'link';
}

export type AppHeaderMenu = Array<AppHeaderMenuLinksItem | AppHeaderMenuLinkItem>;

function createTabsMenu(menu: AppHeaderMenu): TabsMenu {
  const tabsMenu = menu.reduce<(TabsMenuButtonItem | TabsLinkItem)[]>((result, menuItem) => {
    if (menu && isMenu(menuItem)) {
      const tabsLinksItem: TabsMenuButtonItem = {
        title: menuItem.title,
        type: 'menu',
        links: menuItem.links.map(({ title, link }: MenuLinkItem) => ({
          type: 'link',
          title,
          link
        })),
        onSelect: () => undefined
      };
      return [...result, tabsLinksItem];
    } else if (menuItem && isMenuLink(menuItem)) {
      const tabsLinkItem: TabsLinkItem = {
        title: menuItem.title,
        type: 'link',
        link: menuItem.link
      };
      return [...result, tabsLinkItem];
    }
    console.error('Unknown Menu item passed to createTabsMenu, ignoring', menu);
    return result;
  }, []);
  return tabsMenu;
}

export async function AppHeader({ path }: { path: string }) {
  const sharedConfig = await loadSharedConfig(path);
  const headerConfig = sharedConfig?.header;
  const { homeLink, logo, menu: menuItems = [], title } = headerConfig || {};

  const tabsMenu = createTabsMenu(menuItems);

  return (
    <UI homeLink={homeLink} logo={logo} menu={tabsMenu} title={title}>
      <Suspense fallback={<div>Loading Search</div>}>
        {/* @ts-expect-error Server Component */}
        <SearchInput />
      </Suspense>
    </UI>
  );
}
