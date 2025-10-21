import { FC } from 'react';

import { TabMenuItemType } from './index';
import { NavigationItem } from '@salt-ds/core';

export interface TabsButtonItem {
  /**
   * @deprecated use title
   * Label of Tab */
  label?: string;
  /** Callback when Tab is selected */
  onSelect: (event, string) => void;
  /** Title of Tab */
  title: string;
  /** Type of Tab */
  type: TabMenuItemType.BUTTON;
}

interface TabButtonProps {
  active?: boolean;
  item: TabsButtonItem;
}
export const TabsButton: FC<TabButtonProps> = ({ active, item }) => (
  <NavigationItem
    active={active}
    orientation="horizontal"
    render={props => <button type="button" {...props} />}
    onClick={event => item.onSelect(event, item.title)}
  >
    {item.title || item.label}
  </NavigationItem>
);
