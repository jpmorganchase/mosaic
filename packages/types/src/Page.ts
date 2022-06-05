type Page<AdditionalProps = {}> = {
  title: string;
  /**
   * Friendly routes are the shortest possible paths that will point to a page.
   * They are useful for creating more user-friendly links on pages, rather than using a full filesystem path.
   * They originally start as the same as `route`, but can be modified by plugins whenever they make a change to how a page resolves.
   * e.g. The `PagesWithoutFileExtPlugin` modifies the friendly route after it creates aliases for every page (to allow
   * them to be referenced without a file extension). Another example would be a plugin that allows `/index` to be
   * automatically added if a route points to a directory -- the `friendlyRoute` could then be modified by that
   * plugin to remove `/index`
   */
  friendlyRoute: string;
  route: string;
  lastModified?: Date;
  path?: string;
  content?: string;
} & Record<string, unknown> &
  AdditionalProps;

export default Page;
