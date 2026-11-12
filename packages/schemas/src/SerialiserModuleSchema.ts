import { z } from 'zod';
import { pluginModuleSchema } from './PluginModuleSchema.js';

export const serialiserModuleSchema = pluginModuleSchema.merge(
  z.object({
    filter: z
      .any()
      .optional()
      .transform(val => new RegExp(val))
  })
);

export type SerialiserModuleDefinition = z.infer<typeof serialiserModuleSchema>;
