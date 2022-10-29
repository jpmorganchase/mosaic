export interface PluginModuleDefinition {
  /**
   * Options to pass to the plugin lifecycle methods.
   */
  options: Record<string, unknown>;
  /**
   * The importance of this plugin. This highest number plugin will be run first
   */
  priority?: number;
  /**
   * Exclude this plugin when running `mosaic build`
   */
  runTimeOnly?: boolean;
  /**
   * Path to the JS file for this plugin (can either export a `default` module with lifecycle methods,
   * or export the methods individually)
   */
  modulePath: string;
}
