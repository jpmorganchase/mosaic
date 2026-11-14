import { beforeEach, describe, expect, test, vi } from 'vitest';

const session = vi.hoisted(() => ({ editor: true }));
const serializeMdxForClient = vi.hoisted(() => vi.fn(async () => ({ compiledSource: '' })));

vi.mock('../../../../auth', () => ({
  auth: async () => (session.editor ? { user: { name: 'Editor' } } : null),
  isAuthorizedEditor: () => session.editor
}));
vi.mock('@jpmorganchase/mosaic-site-middleware', () => ({ serializeMdxForClient }));

import { MAX_FRONTMATTER_BYTES, MAX_MARKDOWN_BYTES } from '../../../../lib/editorLimits';
import { compilePreview } from '../previewAction';

beforeEach(() => {
  session.editor = true;
  serializeMdxForClient.mockClear();
});

describe('GIVEN the preview Server Action', () => {
  test('THEN it compiles a page up to the largest size a save accepts', async () => {
    const largest = 'a'.repeat(MAX_MARKDOWN_BYTES + MAX_FRONTMATTER_BYTES);
    await compilePreview(largest);
    expect(serializeMdxForClient).toHaveBeenCalledWith(largest);
  });

  test('WHEN the page is larger THEN it refuses without compiling', async () => {
    await expect(
      compilePreview('a'.repeat(MAX_MARKDOWN_BYTES + MAX_FRONTMATTER_BYTES + 1))
    ).rejects.toThrow('Page is too large to preview');
    expect(serializeMdxForClient).not.toHaveBeenCalled();
  });

  test('WHEN the caller is not an editor THEN it refuses', async () => {
    session.editor = false;
    await expect(compilePreview('# Hi')).rejects.toThrow('Unauthorized');
    expect(serializeMdxForClient).not.toHaveBeenCalled();
  });
});
