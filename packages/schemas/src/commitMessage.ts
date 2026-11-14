/** Shared by the editor, host action and Git workflows; safe to import in a browser. */
export const MAX_COMMIT_MESSAGE_BYTES = 8 * 1024;

export function normalizeCommitMessage(message: string): string {
  return message.replace(/\r\n/g, '\n');
}

export function validateCommitMessage(value: unknown): string | null {
  if (typeof value !== 'string') return 'Commit message must be text.';
  const message = normalizeCommitMessage(value);
  if (!message.trim()) return 'Enter a commit message.';
  // Only normal line breaks are allowed among control characters.
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x09\x0b-\x1f\x7f-\x9f]/.test(message)) {
    return 'Commit message contains invalid control characters.';
  }
  if (new TextEncoder().encode(message).length > MAX_COMMIT_MESSAGE_BYTES) {
    return 'Commit message must be at most 8 KiB.';
  }
  return null;
}
