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

/**
 *  [[`SidebarSlice`]] specifies sidebar content
 */
export type SidebarSlice = {
  /** Sidebar items */
  sidebarData: SidebarItem[];
};
