import { z } from 'zod';

export const pluginModuleSchema = z.object({
  /**
   * Path to the JS file for this plugin (can either export a `default` module with lifecycle methods,
   * or export the methods individually)
   */
  modulePath: z.string({ required_error: 'A path to the plugin module is required.' }),
  /**
   * Set to true to prevent the plugin from running
   */
  disabled: z.boolean().optional(),
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
  priority: z.number().optional(),
  /**
   * Set to true to prevent the plugin from running when a source has a "preview" namespace
   */
  previewDisabled: z.boolean().optional(),
  /**
   * Set to true to allow loading multiple instances of this plugin
   */
  allowMultiple: z.boolean().optional()
});

export type PluginModuleDefinition = z.infer<typeof pluginModuleSchema>;
