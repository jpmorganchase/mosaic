import React, { FC, KeyboardEvent, MouseEvent } from 'react';
import { Menu, MenuItem, MenuPanel, MenuTrigger, Button } from '@salt-ds/core';
import classnames from 'clsx';

import styles from './tabsMenuButton.css';
import type { TabsLinkItem } from './TabsLink';
import { Icon } from '../Icon';

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
  type: 'menu';
}

export interface TabsMenuButtonProps {
  children: React.ReactNode;
  item: TabsMenuButtonItem;
  className?: string;
}

export const TabsMenuButton: FC<TabsMenuButtonProps> = ({ children, className, item }) => (
  <Menu>
    <MenuTrigger>
      <Button variant="secondary" className={classnames([className, styles.root])}>
        <span>{item.title || item.label}</span>
        {children}
        <Icon name="chevronDown" aria-hidden />
      </Button>
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
