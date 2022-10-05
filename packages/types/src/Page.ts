/**
 * `Page` is a type, which at a minimum has a `fullPath`, but can also contain metadata and `content`
 */
type Page<AdditionalProps = {}> = {
  fullPath: string;
  title?: string;
  /**
   * Friendly fullPaths are the shortest possible paths that will point to a page.
   * They are useful for creating more user-friendly links on pages, rather than using a full filesystem path.
   * They originally start as the same as `fullPath`, but can be modified by plugins whenever they make a change to how a page resolves.
   * e.g. The `PagesWithoutFileExtPlugin` modifies the friendly fullPath after it creates aliases for every page (to allow
   * them to be referenced without a file extension). Another example would be a plugin that allows `/index` to be
   * automatically added if a fullPath points to a directory -- the `route` could then be modified by that
   * plugin to remove `/index`
   */
  route?: string;
  lastModified?: Date;
  type?: string;
  content?: string;
} & Record<string, unknown> &
  AdditionalProps;

export default Page;
