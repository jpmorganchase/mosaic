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
  /** The level of the menu item from the sidebar root */
  level: number;
  /** Child nodes */
  childNodes: SidebarItem[];
  /** Whether the item is hidden */
  hidden: boolean;
};
