import { z } from 'zod';

export const pluginModuleSchema = z.object({
  /**
   * Path to the JS file for this plugin (can either export a `default` module with lifecycle methods,
   * or export the methods individually)
   */
  modulePath: z.string({ required_error: 'A path to the plugin module is required.' }),
  /**
   * Options to pass to the plugin lifecycle methods.
   */
  options: z.unknown().optional(),
  /**
   * Exclude this plugin when running `mosaic build`
   */
  runTimeOnly: z.boolean().optional(),
  /**
   * The importance of this plugin. This highest number plugin will be run first
   */
  priority: z.number().optional()
});

export type PluginModuleDefinition = z.infer<typeof pluginModuleSchema>;
