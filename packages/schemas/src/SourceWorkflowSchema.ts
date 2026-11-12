import { z } from 'zod';
import type { SourceWorkflowPrepare } from './WorkflowDefaultsSchema.js';

export const sourceWorkflowSchema = z.object({
  /**
   * The name of the workflow
   */
  name: z.string(),
  /**
   * Workflow config options
   */
  options: z.record(z.string(), z.unknown()),
  /**
   * action to run when workflow is triggered
   */
  action: z.any().optional(),
  /** Side-effect-free defaults lookup; absent means no editable message support. */
  prepare: z.custom<SourceWorkflowPrepare>(value => typeof value === 'function').optional()
});

export type SourceWorkflow = z.infer<typeof sourceWorkflowSchema>;
