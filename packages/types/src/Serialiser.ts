import type { TDataOut } from 'memfs/lib/encoding';

import type Page from './Page';
import type SerialiserModuleDefinition from './SerialiserModuleDefinition';

/**
 * Serialisers are a form of plugin that tells PullDocs how to turn a file from/to a storable form for the filesystem
 * or a `Page` object.
 * For technical clarity - when a parser method is called, it will trigger `parserRunner` which checks the `route` against
 * the `test` option that was passed in the PullDocs config file, to find a suitable parser.
 */
export type Serialiser = {
  /**
   * Method to turn a raw page (e.g. an MDX file) into a `Page` object
   * @param route Route on virtual disk (should be full route, not an alias)
   * @param page Page in string or buffer form (i.e. an MDX page with frontmatter or a JSON file as a string)
   * @returns Page object in the `Page` format
   */
  deserialise: (route: string, page: TDataOut) => Promise<Page>;
  /**
   * Method to load a raw page from disk (e.g. an MDX file) and return into a `Page` object
   * @param route Route on virtual disk (should be full route, not an alias)
   * @param pagePath Location on physical disk where content can be lazy loaded from
   * @returns Page content
   */
  serialise: (route: string, page: Page) => Promise<TDataOut>;
};

export type LoadedSerialiser = Serialiser & SerialiserModuleDefinition;

export default Serialiser;
