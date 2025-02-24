import type { SerialiserModuleDefinition } from './index.js';
import type { Page } from './Page.js';
import type { TDataOut } from './Volume.js';

/**
 * Serialisers are a form of plugin that tells Mosaic how to turn a file from/to a storable form for the filesystem
 * or a `Page` object.
 * For technical clarity - when a parser method is called, it will trigger `parserRunner` which checks the `fullPath` against
 * the `test` option that was passed in the Mosaic config file, to find a suitable parser.
 */
export type Serialiser<TPage extends Page = Page> = {
  /**
   * Method to turn a raw page (e.g. an MDX file) into a `Page` object
   * @param fullPath Route on virtual disk (should be full fullPath, not an alias)
   * @param page Page in string or buffer form (i.e. an MDX page with frontmatter or a JSON file as a string)
   * @returns Page object in the `Page` format
   */
  deserialise: (fullPath: string, page: TDataOut) => Promise<TPage>;
  /**
   * Method to load a raw page from disk (e.g. an MDX file) and return into a `Page` object
   * @param fullPath Route on virtual disk (should be full fullPath, not an alias)
   * @param page Page in `Page` form
   * @returns Page content
   */
  serialise: (fullPath: string, page: TPage) => Promise<TDataOut>;
};

export type LoadedSerialiser = Serialiser & SerialiserModuleDefinition;
