/**
 * One searchable part of a page: its introduction (the text before the
 * first section heading) or one section. Search results link to
 * `route#anchor`, so sections can be found by their own heading.
 *
 * This is the contract between the content pipeline and search: the
 * engine that queries these records can change without changing the
 * plugin.
 */
export interface SearchRecord {
  /** `route` for the introduction, `route#anchor` for a section. */
  id: string;
  route: string;
  /** The section heading's id. Absent for the introduction. */
  anchor?: string;
  /** The page title. */
  title: string;
  /** Section headings from the outermost in, e.g. `['Examples', 'Disabled']`. Empty for the introduction. */
  headings: string[];
  /** Prose of the section, without code blocks, JSX attributes or MDX expressions. */
  text: string;
  /** The first URL segment, e.g. `mosaic`. */
  namespace: string;
  /**
   * Frontmatter fields configured with the plugin's `records.fields` option,
   * such as `description` and `keywords`. Only on the introduction record,
   * because they describe the whole page.
   */
  fields?: Record<string, string | string[]>;
}

/** The format of `search-records.json`, written by `SearchIndexPlugin`. */
export interface SearchRecordsFile {
  version: 1;
  records: SearchRecord[];
}
