export type SidebarItem = {
  /** The id of the item */
  id: string;
  /** The name of the item */
  name: string;
  /** Sidebar data */
  data: {
    /** The link of the item */
    link: string;
  };
  /** Child nodes */
  childNodes: SidebarItem[];
  /** Whether the item is hidden */
  hidden: boolean;
};
/**
 *  [[`SidebarSlice`]] specifies sidebar content
 */
export type SidebarSlice = {
  /** Sidebar items */
  sidebarData: SidebarItem[];
};
