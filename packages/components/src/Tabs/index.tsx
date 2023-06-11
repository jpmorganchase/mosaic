'use client';
import React from 'react';
import classnames from 'clsx';

import { TabsBase, TabsButtonItem, TabMenuItemType } from '../TabsBase';
import { ViewStack } from '../ViewStack';
import type { ViewProps } from '../ViewStack/View';
import styles from './styles.css';

export { View as Tab } from '../ViewStack';

type TabView = ViewProps<string>;

export interface TabsProps {
  /** Additional class name for root class override */
  className?: string;
  /** Tab elements defined by each child */
  children: React.ReactElement;
}

interface ExtendedTabsButtonItem extends TabsButtonItem {
  defaultView?: boolean;
}

export const Tabs: React.FC<TabsProps> = ({ className, children }) => {
  const [currentViewId, setCurrentViewId] = React.useState();

  let hasDefaultView = false;
  const menu = React.Children.map(children, (child, childIndex) => {
    if (!React.isValidElement<TabView>(child)) {
      console.warn(`Ignoring invalid child for Tabs with ${child}`);
      return null;
    }
    hasDefaultView =
      !hasDefaultView && Object.prototype.hasOwnProperty.call(child.props, 'defaultView');
    const tabElement: React.ReactElement<TabView> = child;
    const tabButtonItem: ExtendedTabsButtonItem = {
      title: tabElement.props.id || `Tab ${childIndex}`,
      defaultView: Object.prototype.hasOwnProperty.call(child.props, 'defaultView'),
      type: TabMenuItemType.BUTTON,
      onSelect: (_event, sourceItem) => setCurrentViewId(sourceItem)
    };
    return tabButtonItem;
  });
  if (menu && menu.length && !hasDefaultView) {
    menu[0].defaultView = true;
  }
  if (!menu || menu.length === 0) {
    return null;
  }

  let selectedIndex = menu.findIndex(({ title }) => title === currentViewId);
  if (selectedIndex === -1) {
    selectedIndex = menu.findIndex(({ defaultView }) => defaultView);
  }
  return (
    <>
      <TabsBase
        className={classnames(className, styles.tabs)}
        menu={menu}
        selectedIndex={selectedIndex}
      />
      <ViewStack<string> currentViewId={currentViewId}>{children}</ViewStack>
    </>
  );
};
