import { describe, expect, test, vi } from 'vitest';
import { resolveCommitMessage, commitMessageTitle, prepareCommitMessage } from '../commitMessage';

describe('source commit messages', () => {
  test.each([
    [{}, 'docs: update /docs/page.mdx'],
    [{ isNewPage: true }, 'docs: create /docs/page.mdx'],
    [{ targetRoute: '/docs/new.mdx' }, 'docs: rename /docs/page.mdx to /docs/new.mdx'],
    [{ targetRoute: '/docs/page.mdx' }, 'docs: update /docs/page.mdx']
  ])('uses an explicit action for %j', (input, expected) => {
    expect(resolveCommitMessage(undefined, '/docs/page.mdx', input)).toBe(expected);
  });
  test('preserves static and legacy callback defaults verbatim', () => {
    const legacy = vi.fn(path => `custom updated content ${path}`);
    expect(resolveCommitMessage(legacy, '/docs/page.mdx', { isNewPage: true })).toBe(
      'custom updated content /docs/page.mdx'
    );
    expect(legacy).toHaveBeenCalledWith('/docs/page.mdx', { action: 'create' });
    expect(resolveCommitMessage('Fixed default', '/docs/page.mdx', {})).toBe('Fixed default');
  });
  test('passes rename context and prefers the author override without calling the default', () => {
    const configured = vi.fn((_path, context) => `Move to ${context.targetRoute}`);
    expect(
      resolveCommitMessage(configured, '/docs/old.mdx', { targetRoute: '/docs/new.mdx' })
    ).toBe('Move to /docs/new.mdx');
    configured.mockClear();
    expect(
      resolveCommitMessage(configured, '/docs/old.mdx', { commitMessage: 'Custom\r\n\r\nBody' })
    ).toBe('Custom\n\nBody');
    expect(configured).not.toHaveBeenCalled();
    expect(() => resolveCommitMessage(configured, '/docs/old.mdx', { commitMessage: '' })).toThrow(
      'Enter a commit message'
    );
  });
  test('prepares only message metadata and keeps prefix plus first nonempty summary for titles', async () => {
    expect(
      await prepareCommitMessage(
        { credentials: 'private' },
        { commitMessage: 'Default' },
        '/docs/a',
        {}
      )
    ).toEqual({ supportsCommitMessage: true, commitMessage: 'Default' });
    expect(commitMessageTitle('\nSummary\n\nBody', 'Docs')).toBe('Docs - Summary');
    expect(commitMessageTitle('Summary\nBody', '')).toBe('Summary');
  });

  test('bounds the complete provider title including a long prefix', () => {
    expect(commitMessageTitle('a'.repeat(255), '')).toBe('a'.repeat(255));
    expect(commitMessageTitle('a'.repeat(248), 'Docs')).toBe(`Docs - ${'a'.repeat(248)}`);
    expect(commitMessageTitle('a'.repeat(300), 'Docs')).toBe(`Docs - ${'a'.repeat(247)}…`);
    expect(commitMessageTitle('Summary', 'p'.repeat(300))).toBe(`${'p'.repeat(254)}…`);
  });

  test('does not split a supplementary Unicode character at the title boundary', () => {
    expect(commitMessageTitle(`${'a'.repeat(253)}📝 more`, '')).toBe(`${'a'.repeat(253)}…`);
    expect(commitMessageTitle(`${'a'.repeat(252)}📝 more`, '')).toBe(`${'a'.repeat(252)}📝…`);
  });
});
