import React from 'react';
import type { TabsLinkItem, TabsMenu, TabsMenuButtonItem } from '@jpmorganchase/mosaic-components';
import { TabMenuItemType } from '@jpmorganchase/mosaic-components';
import type { Menu, MenuLinkItem } from '@jpmorganchase/mosaic-store';
import { useAppHeader, MenuItemType } from '@jpmorganchase/mosaic-store';

function createTabsMenu(menu: Menu[]): TabsMenu {
  const tabsMenu = menu.reduce<(TabsMenuButtonItem | TabsLinkItem)[]>((result, menuItem) => {
    if (menuItem.type === MenuItemType.MENU) {
      const tabsLinksItem: TabsMenuButtonItem = {
        title: menuItem.title,
        type: TabMenuItemType.MENU,
        links: menuItem.links.map(({ title, link }: MenuLinkItem) => ({
          type: TabMenuItemType.LINK,
          title,
          link
        })),
        onSelect: () => undefined
      };
      return [...result, tabsLinksItem];
    }
    if (menuItem.type === MenuItemType.LINK) {
      const tabsLinkItem: TabsLinkItem = {
        title: menuItem.title,
        type: TabMenuItemType.LINK,
        link: menuItem.link
      };
      return [...result, tabsLinkItem];
    }
    console.error('Unknown Menu item passed to createTabsMenu, ignoring', menu);
    return result;
  }, []);
  return tabsMenu;
}

export const withAppHeaderAdapter = Component => () => {
  const headerConfig = useAppHeader();
  const {
    HeaderControlsProps = {},
    homeLink,
    logo,
    menu: menuItems = [],
    title
  } = headerConfig || {};
  const tabsMenu = createTabsMenu(menuItems);
  return (
    <Component
      {...HeaderControlsProps}
      homeLink={homeLink}
      logo={logo}
      menu={tabsMenu}
      title={title}
    />
  );
};
