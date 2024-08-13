import { z } from 'zod';

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
  action: z.any()
});

export type SourceWorkflow = z.infer<typeof sourceWorkflowSchema>;
