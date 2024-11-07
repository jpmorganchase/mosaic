import { VerticalNavigation } from './VerticalNavigation';

export interface SidebarNode {
  /** The id of the item */
  id: string;
  /** Node kind */
  kind: 'data';
  /** The name of the item */
  name: string;
  /** Sidebar data */
  data: {
    /** The level of the menu item from the sidebar root */
    level: number;
    /** The link of the item */
    link: string;
  };
  /** Whether the item is hidden */
  hidden: boolean;
}

export interface SidebarGroup {
  /** The id of the item */
  id: string;
  /** Node kind */
  kind: 'group';
  /** Child nodes */
  childNodes: SidebarItem[];
  /** The name of the item */
  name: string;
  /** Whether the item is hidden */
  hidden: boolean;
}

export type SidebarItem = SidebarNode | SidebarGroup;

export type PageNavigationProps = {
  menu: SidebarItem[];
  selectedNodeId?: string;
  selectedGroupIds?: Set<string>;
};

export const PageNavigation = ({ menu, selectedNodeId, selectedGroupIds }: PageNavigationProps) => {
  return (
    <VerticalNavigation
      menu={menu}
      selectedNodeId={selectedNodeId}
      selectedGroupIds={selectedGroupIds}
    />
  );
};
