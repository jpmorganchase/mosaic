import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { hasProtocol, TabsBase, TabMenuItemType } from '@jpmorganchase/mosaic-components';
import type { TabsMenu, TabsMenuButtonItem, TabsLinkItem } from '@jpmorganchase/mosaic-components';

import { NavigationEvents } from '../NavigationEvents';
import { useWindowResize, Size } from './useWindowResize';

export type { TabsMenu } from '@jpmorganchase/mosaic-components';

function resolveSelectedIndex(menu, itemPath) {
  let selectedIndex = -1;
  let longestMatch = 0;
  for (let i = 0; i < menu.length; i++) {
    const item: TabsMenuButtonItem | TabsLinkItem = menu[i];
    if (item.type === TabMenuItemType.MENU) {
      // eslint-disable-next-line no-restricted-syntax
      for (const { link: subLink } of item.links) {
        // If menu link matches the current route - we can return this index
        if (subLink === itemPath) {
          return i;
        }
        // If current item is contained within part of route (e.g. /case-studies when route is /case-studies/item)
        // and the link will be the longest matching one we've seen so far (longest means closest match)
        if (itemPath.startsWith(subLink) && subLink.length > longestMatch) {
          selectedIndex = i;
          longestMatch = subLink.length;
        }
      }
    } else {
      // If menu link matches the current route - we can return this index
      if (item.link === itemPath) {
        return i;
      }
      // If current item is contained within part of route (e.g. /case-studies when route is /case-studies/item)
      // and the link will be the longest matching one we've seen so far (longest means closest match)
      if (itemPath.startsWith(item.link) && item.link.length > longestMatch) {
        selectedIndex = i;
        longestMatch = item.link.length;
      }
    }
  }
  return selectedIndex;
}

export function AppHeaderTabs({ menu = [] }: { menu: TabsMenu }) {
  const router = useRouter();
  const size: Size = useWindowResize();
  const getSelectedTabIndex = React.useCallback(
    itemPath => resolveSelectedIndex(menu, itemPath),
    [menu]
  );
  const pathname = usePathname();

  const [selectionIndex, setSelectionIndex] = useState(() => -1);

  const updateSelection = (route: string) => {
    const currentSelection = getSelectedTabIndex(route);
    setSelectionIndex(currentSelection);
  };

  const handleRouteChangeComplete = (newRoute: string) => updateSelection(newRoute);

  useEffect(() => {
    if (pathname && size?.width) {
      updateSelection(pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, size]);

  const handleMenuSelect = (_event, sourceItem) => {
    const { link } = sourceItem as TabsLinkItem;
    if (hasProtocol(link)) {
      window.open(link, '_blank');
    } else {
      router.push(link);
    }
  };
  const linkedMenu = menu.map(menuItem => {
    if (menuItem.type === TabMenuItemType.MENU) {
      return { ...menuItem, onSelect: handleMenuSelect };
    }
    return menuItem;
  });
  return (
    <>
      <Suspense fallback={null}>
        <NavigationEvents onRouteChange={handleRouteChangeComplete} />
      </Suspense>
      <TabsBase menu={linkedMenu} selectedIndex={selectionIndex} />
    </>
  );
}
