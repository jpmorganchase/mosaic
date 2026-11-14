import { describe, expect, test } from 'vitest';
import { validateCommitMessage, normalizeCommitMessage } from '../commitMessage';
import { workflowDefaultsSchema } from '../WorkflowDefaultsSchema';
import { sourceWorkflowSchema } from '../SourceWorkflowSchema';

describe('commit messages', () => {
  test.each([
    undefined,
    null,
    1,
    '',
    ' \n ',
    'text\0',
    'text\t',
    'text\rbody',
    'text\u007f',
    'é'.repeat(4097)
  ])('rejects invalid text %j', value => {
    expect(validateCommitMessage(value)).toEqual(expect.any(String));
  });
  test('normalizes CRLF and measures UTF-8 bytes without trimming the message', () => {
    expect(normalizeCommitMessage(' summary\r\n\r\nbody ')).toBe(' summary\n\nbody ');
    expect(validateCommitMessage('é'.repeat(4096))).toBeNull();
    expect(validateCommitMessage(' summary\r\nbody ')).toBeNull();
  });
  test('allows only the public metadata fields', () => {
    expect(
      workflowDefaultsSchema.parse({
        supportsCommitMessage: true,
        commitMessage: 'Summary',
        credentials: 'private'
      })
    ).toEqual({ supportsCommitMessage: true, commitMessage: 'Summary' });
    expect(
      workflowDefaultsSchema.parse({ supportsCommitMessage: false, commitMessage: 'private' })
    ).toEqual({ supportsCommitMessage: false });
    expect(
      workflowDefaultsSchema.safeParse({ supportsCommitMessage: true, commitMessage: '' }).success
    ).toBe(false);
  });
  test('preserves the optional side-effect-free hook in source configuration', () => {
    const prepare = () => ({ supportsCommitMessage: false as const });
    expect(sourceWorkflowSchema.parse({ name: 'save', options: {}, prepare }).prepare).toBe(
      prepare
    );
    expect(
      sourceWorkflowSchema.safeParse({ name: 'save', options: {}, prepare: 'code' }).success
    ).toBe(false);
  });
});
