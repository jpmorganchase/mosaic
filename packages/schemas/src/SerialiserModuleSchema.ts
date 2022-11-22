import { z } from 'zod';
import { pluginModuleSchema } from './PluginModuleSchema.js';

export const serialiserModuleSchema = pluginModuleSchema.merge(
  z.object({
    filter: z
      .any({ required_error: 'A regex is required to filter pages' })
      .transform(val => new RegExp(val))
  })
);

export type SerialiserModuleDefinition = z.infer<typeof serialiserModuleSchema>;
