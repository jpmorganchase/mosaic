/**
 *  [[`ContentProps`]] specifies the page source/content
 */
export interface ContentProps {
  /** Page source, which will be page type specific */
  source?: Record<string, unknown>;
  /** Page type */
  type?: string;
  /** Raw page content, includes markdown and frontmatter */
  raw?: string;
}
