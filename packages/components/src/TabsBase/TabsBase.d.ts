import React, { FC } from 'react';
import { TabsButtonItem } from './TabsButton';
import { TabsLinkItem } from './TabsLink';
import { TabsMenuButtonItem } from './TabsMenuButton';
export declare enum TabMenuItemType {
  MENU = 'menu',
  LINK = 'link',
  BUTTON = 'button'
}
export interface TabsBaseProps {
  /** Additional class name for root class override */
  className?: string;
  /** Selected child/tab index */
  selectedIndex?: number;
  /** Menu descriptor */
  menu: TabsMenu;
}
export declare type TabsMenu = (TabsLinkItem | TabsButtonItem | TabsMenuButtonItem)[];
export declare const TabsBase: FC<React.PropsWithChildren<TabsBaseProps>>;
