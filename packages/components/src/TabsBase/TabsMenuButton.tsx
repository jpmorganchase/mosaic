import React, { FC, KeyboardEvent, MouseEvent } from 'react';
import { MenuButton, MenuDescriptor } from '@jpmorganchase/uitk-lab';
import classnames from 'classnames';

import styles from './tabsMenuButton.css';
import { TabsLinkItem } from './TabsLink';
import { TabMenuItemType } from './index';

export interface TabsMenuButtonItem {
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

export const TabsMenuButton: FC<TabsMenuButtonProps> = ({ children, className, item }) => (
  <MenuButton
    className={classnames([className, styles.root])}
    CascadingMenuProps={{
      initialSource: { menuItems: item.links },
      onItemClick: (sourceItem, event) => item.onSelect(event, sourceItem)
    }}
  >
    <span>{item.title}</span>
    {children}
  </MenuButton>
);
