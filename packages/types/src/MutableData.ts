type MutableData<T = {}> = ImmutableData<T> & {
  /**
   * Set arbitrary data onto the config object. This value will persist across plugins and
   * also be sent to the parent process when it executes plugins there as well.
   * Values can be retrieved from `data`.
   * This data is one-way, it can only be set/mutated in the child process lifecycle stages
   * This will be reset everytime the relevant source receives new pages
   * @param data Data to MERGE into the existing blob
   */
  setData(data: Partial<T>, overwrite?: boolean): void;
  /**
   * Helper function for declaring new aliases that will be applied by the AliasPlugin.
   * Values can be retrieved from `data.aliases`
   * This will be reset everytime the relevant source receives new pages
   * @param fullPath The file/fullPath the alias will point to
   * @param aliases Array of aliases to use when pointing to this page
   */
  setAliases(targetPath: string, aliases: string[]): void;
  /**
   * Helper function for declaring new tags (which are basically aliases to /.tags) that will be applied by the AliasPlugin.
   * Values can be retrieved from `data.aliases`
   * This will be reset everytime the relevant source receives new pages
   * @param fullPath The file/fullPath the alias will point to
   * @param tags Array of tag names to use when pointing to this page
   */
  setTags(targetPath: string, tags: string[]): void;
  /**
   * Helper function for declaring new refs that will be applied by the RefPlugin
   * This will be reset everytime the relevant source receives new pages
   * Values can be retrieved from `data.refs`
   * @param targetPath The file/fullPath to write the ref to
   * @param targetPropPath The path to the property where the ref will be applied
   * @param refValue The value of the ref (can be a wildcard)
   */
  setRef(targetFilepath: string, targetPropPath: string | string[], refValue: string): void;
  /**
   * Same as `setRef`, but do not pre-resolve this ref - wait until the file is read and use the global filesystem for it
   * @param targetPath The file/fullPath to write the ref to
   * @param targetPropPath The path to the property where the ref will be applied
   * @param refValue The value of the ref (can be a wildcard)
   */
  setGlobalRef(targetFilepath: string, targetPropPath: string | string[], refValue: string): void;
  /**
   * This object, but without the mutation methods like `setAliases`, `setData` etc
   */
  asReadOnly(): ImmutableData<T>;
};

export type ImmutableData<T = {}> = {
  readonly data: Readonly<
    T & { readonly refs: string[]; readonly aliases: Set<{ $$path: string[]; $$value: string }> }
  >;
};

export default MutableData;
