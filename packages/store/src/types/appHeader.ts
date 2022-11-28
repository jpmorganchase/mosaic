/**
 *  [[`MenuItemType`]] defines the type of App header Menu items
 */
export enum MenuItemType {
  MENU = 'menu',
  LINK = 'link'
}

/**
 *  [[`Menu`]] defines App Header menus
 */
export type Menu = MenuLinksItem | MenuLinkItem;

/**
 *  [[`MenuLinksItem`]] defines a menu of links
 */
export interface MenuLinksItem {
  /** Collection of link options */
  links: MenuLinkItem[];
  /** Title of Tab */
  title: string;
}

/**
 *  [[`MenuLinksItem`]] defines a menu of links and includes a type
 */
export interface AppHeaderMenuLinksItem {
  /** Collection of link options */
  links: MenuLinkItem[];
  /** Title of Tab */
  title: string;
  /** Type of Tab */
  type: MenuItemType.MENU;
}

/**
 *  [[`MenuLinkItem`]] define a menu link
 */
export interface MenuLinkItem {
  /** URL linked by Tab */
  link: string;
  /** Title of Tab */
  title?: string;
}

/**
 *  [[`MenuLinkItem`]] define a menu link and include a type
 */
export interface AppHeaderMenuLinkItem {
  /** URL linked by Tab */
  link: string;
  /** Title of Tab */
  title?: string;
  /** Type of Tab */
  type: MenuItemType.LINK;
}

/**
 *  [[`AppHeaderSlice`]] specifies the contents of the AppHeader
 */
export type AppHeaderSlice = {
  /** App logo/title  */
  title: string;
  /** Link to the home page */
  homeLink: string;
  /** Logo URL */
  logo?: string;
  /** App Header menu */
  menu: Menu[];
  /** Search namespace, suffix used on env variable `process.env.SEARCH_ENDPOINT` to filter search results to a specific namespace. */
  searchNamespace?: string;
};
