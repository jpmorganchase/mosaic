import { describe, expect, test } from 'vitest';
import { Volume } from 'memfs';

import FileAccess from '../filesystems/FileAccess.js';

describe('GIVEN FileAccess.$$symlinksFromJSON', () => {
  test('THEN every symlink exists by the time the returned promise resolves', async () => {
    const volume = new Volume();
    volume.fromJSON({ '/docs/page.mdx': 'content', '/docs/other.mdx': 'other' });
    const fileAccess = new FileAccess(volume);

    await fileAccess.$$symlinksFromJSON({
      '/aliases/nested/page.mdx': [{ target: '/docs/page.mdx', type: 'file' }],
      '/aliases/other.mdx': [{ target: '/docs/other.mdx', type: 'file' }]
    });

    expect(volume.readlinkSync('/aliases/nested/page.mdx')).toBe('/docs/page.mdx');
    expect(volume.readlinkSync('/aliases/other.mdx')).toBe('/docs/other.mdx');
  });

  test('THEN a failure rejects the returned promise instead of becoming an unhandled rejection', async () => {
    const volume = new Volume();
    volume.fromJSON({ '/docs/page.mdx': 'content' });
    const fileAccess = new FileAccess(volume);

    await expect(
      fileAccess.$$symlinksFromJSON({
        // The alias's parent is a file, so the symlink can't be created.
        '/docs/page.mdx/alias.mdx': [{ target: '/docs/page.mdx', type: 'file' }]
      })
    ).rejects.toThrow();
  });
});
