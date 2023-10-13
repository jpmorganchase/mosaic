import React from 'react';
import { VerticalNavigation } from './VerticalNavigation';

export type PageNavigationItem = {
  /** The id of the item */
  id: string;
  /** The name of the item */
  name: string;
  /** Sidebar data */
  data: {
    /** The link of the item */
    link: string;
  };
  /** The level of the menu item from the sidebar root */
  level: number;
  /** Child nodes */
  childNodes: PageNavigationItem[];
  /** Whether the item is hidden */
  hidden: boolean;
};

export type PageNavigationProps = {
  menu: PageNavigationItem[];
  selectedNodeId?: string;
  expandedNodeIds?: Set<string>;
};

export const PageNavigation = ({ menu, selectedNodeId, expandedNodeIds }: PageNavigationProps) => (
  <VerticalNavigation
    menu={menu}
    selectedNodeId={selectedNodeId}
    expandedNodeIds={expandedNodeIds}
  />
);
