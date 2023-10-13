/**
 *  [[`TableOfContentsItem`]] defines a table of contents item
 */
export type TableOfContentsItem = {
  /** The depth of the heading */
  level: number;
  /** The id attribute of the heading */
  id: string;
  /** The heading text */
  text: string;
};

/**
 *  [[`TableOfContentsSlice`]] defines the table of contents for a page
 */
export type TableOfContentsSlice = {
  /** Path described in breadcrumbs */
  tableOfContents: TableOfContentsItem[];
};
