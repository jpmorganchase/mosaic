import { FC } from 'react';

import { Link } from '../Link';
import { TabMenuItemType } from './index';
import { NavigationItem } from '@salt-ds/core';

export interface TabsLinkItem {
  /**
   * @deprecated use title
   * Label of Tab */
  label?: string;
  /** URL linked by Tab */
  link: string;
  /** Title of Tab */
  title?: string;
  /** Type of Tab */
  type: TabMenuItemType.LINK;
}

export interface TabsLinkProps {
  active?: boolean;
  item: TabsLinkItem;
}

export const TabsLink: FC<TabsLinkProps> = ({ active, item }) => (
  <NavigationItem
    active={active}
    orientation="horizontal"
    href={item.link}
    render={props => <Link variant="component" {...props} />}
  >
    {item.title || item.label}
  </NavigationItem>
);
