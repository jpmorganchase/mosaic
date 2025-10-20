import { FC, KeyboardEvent, MouseEvent } from 'react';
import { Menu, MenuItem, MenuPanel, MenuTrigger, NavigationItem } from '@salt-ds/core';

import type { TabsLinkItem } from './TabsLink';
import type { TabMenuItemType } from './index';

export interface TabsMenuButtonItem {
  /**
   * @deprecated use title
   * Label of Tab */
  label?: string;
  /** Collection of link options */
  links: TabsLinkItem[];
  /** Callback when Tab is selected */
  onSelect: (event: MouseEvent | KeyboardEvent, sourceItem: TabsLinkItem) => void;
  /** Title of Tab */
  title: string;
  /** Type of Tab */
  type: TabMenuItemType.MENU;
}

export interface TabsMenuButtonProps {
  active?: boolean;
  item: TabsMenuButtonItem;
}

export const TabsMenuButton: FC<TabsMenuButtonProps> = ({ active, item }) => (
  <Menu>
    <MenuTrigger>
      <NavigationItem
        active={active}
        orientation="horizontal"
        parent
        render={props => <button type="button" {...props} />}
      >
        <span>{item.title || item.label}</span>
      </NavigationItem>
    </MenuTrigger>
    <MenuPanel>
      {item.links.map(link => (
        <MenuItem key={link.title || link.label} onClick={event => item.onSelect(event, link)}>
          {link.title || link.label}
        </MenuItem>
      ))}
    </MenuPanel>
  </Menu>
);
