import { z } from 'zod';
import { pluginModuleSchema } from './PluginModuleSchema.js';
import { sourceWorkflowSchema } from './SourceWorkflowSchema.js';
import { sourceScheduleSchema } from './SourceScheduleSchema.js';

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
    workflows: z.array(sourceWorkflowSchema).optional(),
    /**
     * Configure how often a remote source should check for content updates
     */
    schedule: sourceScheduleSchema.optional()
  })
);

export type SourceModuleDefinition = z.infer<typeof sourceModuleSchema>;
