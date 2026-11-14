import type { SearchRecord } from '@jpmorganchase/mosaic-types';

export type { SearchRecord };

export interface SearchIndexOptions {
  /**
   * Groups of words that mean the same thing, such as
   * `[['dropdown', 'select', 'combobox']]`. A query for any word in a group
   * also finds the others, and those matches rank like the word itself.
   * Each entry must be a single word.
   */
  synonyms?: string[][];
  /**
   * Records with the same group are shown as one result: the best match, with
   * the other matches in `sections`. Defaults to the page route, so each page
   * is one result. Return the same group for pages that are tabs of one page.
   */
  groupBy?: (record: SearchRecord) => string;
  /**
   * Ranks pages when everything else ties: lower comes first. Defaults to `0`
   * for index pages and `1` for the rest.
   */
  pageRank?: (record: SearchRecord) => number;
}

export interface SearchOptions {
  /** Results in this namespace rank above equally good results in others. */
  namespace?: string;
  /** Only return results in these namespaces. */
  namespaces?: string[];
  /** Only return records this returns true for. */
  filter?: (record: SearchRecord) => boolean;
  /** The most results to return. Defaults to `10`. */
  limit?: number;
  /** The most other matching sections to return with each result. Defaults to `3`. */
  sectionsPerResult?: number;
}

export interface SearchHit {
  /** The record id: the route, or `route#anchor` for a section. */
  id: string;
  route: string;
  anchor?: string;
  /** Where the hit links to: `route` or `route#anchor`. */
  href: string;
  title: string;
  /** Section headings from the outermost in. Empty for a page's introduction. */
  headings: string[];
  namespace: string;
  /** A short part of the text around the first match, or the page description. */
  snippet: string;
  /** The words in the record that matched, for `highlight`. */
  terms: string[];
}

export interface SearchResult extends SearchHit {
  /** The group the result was chosen from. See `SearchIndexOptions.groupBy`. */
  group: string;
  /** Other matching sections in the same group, best first. */
  sections: SearchHit[];
}

export interface MosaicSearchIndex {
  search(query: string, options?: SearchOptions): SearchResult[];
  /** The number of records in the index. */
  readonly size: number;
}
