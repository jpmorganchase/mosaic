import React, { FC, KeyboardEvent, MouseEvent } from 'react';
import { MenuDescriptor } from '@salt-ds/lab';
import { TabsLinkItem } from './TabsLink';
import { TabMenuItemType } from './index';
export interface TabsMenuButtonItem {
  /**
   * @deprecated use title
   * Label of Tab */
  label?: string;
  /** Collection of link options */
  links: TabsLinkItem[];
  /** Callback when Tab is selected */
  onSelect: (event: MouseEvent | KeyboardEvent, sourceItem: MenuDescriptor) => void;
  /** Title of Tab */
  title: string;
  /** Type of Tab */
  type: TabMenuItemType.MENU;
}
export interface TabsMenuButtonProps {
  children: React.ReactNode;
  item: TabsMenuButtonItem;
  className?: string;
}
export declare const TabsMenuButton: FC<TabsMenuButtonProps>;
