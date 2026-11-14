import { z } from 'zod';
import { normalizeCommitMessage, validateCommitMessage } from './commitMessage.js';

/** The entire public defaults response. Object parsing strips unrecognized fields. */
export const workflowDefaultsSchema = z.discriminatedUnion('supportsCommitMessage', [
  z.object({ supportsCommitMessage: z.literal(false) }),
  z.object({
    supportsCommitMessage: z.literal(true),
    commitMessage: z
      .string()
      .transform(normalizeCommitMessage)
      .refine(value => !validateCommitMessage(value), {
        message: 'Invalid default commit message.'
      })
  })
]);

export type WorkflowDefaults = z.infer<typeof workflowDefaultsSchema>;

export interface WorkflowDefaultsInput {
  route: string;
  targetRoute?: string;
  isNewPage?: boolean;
}

export type SourceWorkflowPrepare = (
  sourceOptions: unknown,
  options: Record<string, unknown>,
  filePath: string,
  input: Omit<WorkflowDefaultsInput, 'route'>
) => WorkflowDefaults | Promise<WorkflowDefaults>;
