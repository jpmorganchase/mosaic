/**
 * Page within a sequence
 */
export type NavigationLink = {
  /** page title */
  title: string;
  /** page route */
  route: string;
  /** parent group */
  group?: string;
};

/**
 *  [[`Navigation`]] specifies page navigation such as next or previous pages
 */
export type Navigation = {
  /** next page in sequence */
  next?: NavigationLink;
  /** previous page in sequence */
  prev?: NavigationLink;
};
