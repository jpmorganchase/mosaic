import { z } from 'zod';
import { pluginModuleSchema } from './PluginModuleSchema.js';
import { sourceWorkflowSchema } from './SourceWorkflowSchema.js';

export const sourceModuleSchema = pluginModuleSchema.merge(
  z.object({
    /**
     * each site has it's own namespace, think of this as your content's uid
     */
    namespace: z.string(),
    /**
     * set to true to cache the the source pages
     */
    cache: z.boolean().optional(),
    /**
     * A collection of workflows that can be triggered for this source
     */
    workflows: z.array(sourceWorkflowSchema).optional()
  })
);

export type SourceModuleDefinition = z.infer<typeof sourceModuleSchema>;
