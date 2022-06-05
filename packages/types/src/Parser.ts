import type { TDataOut } from 'memfs/lib/encoding';

import type Page from './Page';
import type ParserModuleDefinition from './ParserModuleDefinition';

/**
 * The method the consumer calls, without any additional methods curried on top.
 */
export type Parser = {
  /**
   * Method to turn a raw page (e.g. an MDX file) into a `Page` object, with `content` and `meta`
   * @param route Route on virtual disk (should be full route, not an alias)
   * @param page Page in raw disk form (i.e. an MDX page with frontmatter or a JSON file as a string)
   * @returns Page object in the { content, meta } `Page` format
   */
  deserialise: (route: string, page: TDataOut) => Promise<Page>;
  /**
   * Method to load a raw page from disk (e.g. an MDX file) and return into a `Page` object, with `content` and `meta`
   * @param route Route on virtual disk (should be full route, not an alias)
   * @param pagePath Location on physical disk where content can be lazy loaded from
   * @returns Page content
   */
  deserialiseFromDisk: (route: string, pagePath: string) => Promise<Page>;

  /**
   * Method to turn a page object into a serialised string page (i.e. `Page` with `content` and `meta` into an MDX format)
   * @param route Route on virtual disk (should be full route, not an alias)
   * @param page Page object in the { content, meta } `Page` format
   * @returns Serialised form
   */
  serialise: (route: string, page: Page) => Promise<TDataOut>;
};

export type LoadedParser = Parser & ParserModuleDefinition;

export default Parser;
