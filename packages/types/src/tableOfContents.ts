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
