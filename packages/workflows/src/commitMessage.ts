import {
  normalizeCommitMessage,
  validateCommitMessage
} from '@jpmorganchase/mosaic-schemas/commitMessage';
import type { SourceWorkflowPrepare } from '@jpmorganchase/mosaic-schemas';

export interface CommitMessageContext {
  action: 'create' | 'update' | 'rename';
  targetRoute?: string;
}

export type CommitMessageOption =
  | string
  | ((filePath: string, context: CommitMessageContext) => string);

export function resolveCommitMessage(
  configured: CommitMessageOption | undefined,
  filePath: string,
  input: { isNewPage?: boolean; targetRoute?: string; commitMessage?: unknown }
): string {
  const context: CommitMessageContext = {
    action: input.isNewPage
      ? 'create'
      : input.targetRoute && input.targetRoute !== filePath
      ? 'rename'
      : 'update',
    ...(!input.isNewPage && input.targetRoute && input.targetRoute !== filePath
      ? { targetRoute: input.targetRoute }
      : {})
  };
  const message =
    input.commitMessage !== undefined
      ? input.commitMessage
      : typeof configured === 'function'
      ? configured(filePath, context)
      : configured ??
        `docs: ${context.action} ${filePath}${
          context.targetRoute ? ` to ${context.targetRoute}` : ''
        }`;
  const error = validateCommitMessage(message);
  if (error) throw new Error(error);
  return normalizeCommitMessage(message as string);
}

export function commitMessageTitle(message: string, prefix: string): string {
  const summary =
    message
      .split('\n')
      .find(line => line.trim())
      ?.trim() ?? '';
  const title = prefix ? `${prefix} - ${summary}` : summary;
  // Keep provider titles bounded independently of the full Git commit message.
  // Include the prefix in the budget and avoid splitting a UTF-16 surrogate pair.
  const maxTitleLength = 255;
  if (title.length <= maxTitleLength) return title;
  return `${title
    .slice(0, maxTitleLength - 1)
    .replace(/[\uD800-\uDBFF]$/, '')
    .trimEnd()}…`;
}

export const prepareCommitMessage: SourceWorkflowPrepare = (
  _sourceOptions,
  options,
  filePath,
  input
) => ({
  supportsCommitMessage: true,
  commitMessage: resolveCommitMessage(
    options.commitMessage as CommitMessageOption | undefined,
    filePath,
    input
  )
});
