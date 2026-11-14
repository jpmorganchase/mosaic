import { describe, expect, test, vi } from 'vitest';
import SharedConfigPlugin from '../SharedConfigPlugin.js';

describe('shared config ancestry', () => {
  test.each([false, true])('inherits only ancestors, with reversed input %s', async reverse => {
    const pages = [
      { fullPath: '/docs/index.mdx', sharedConfig: { root: true, title: 'root' } },
      { fullPath: '/docs/left/index.mdx', sharedConfig: { left: true } },
      { fullPath: '/docs/right/index.mdx', sharedConfig: { right: true } },
      { fullPath: '/docs/right/child/index.mdx', sharedConfig: { title: 'child' } },
      { fullPath: '/other/index.mdx', sharedConfig: { isolated: true } }
    ];
    if (reverse) pages.reverse();
    await SharedConfigPlugin.$afterSource!(
      pages as never,
      {
        ignorePages: [],
        pageExtensions: ['.mdx'],
        config: { setData: vi.fn() }
      } as never,
      { filename: '.shared.json' }
    );
    const configAt = (path: string) => pages.find(page => page.fullPath === path)!.sharedConfig;
    expect(configAt('/docs/right/index.mdx')).toEqual({ root: true, title: 'root', right: true });
    expect(configAt('/docs/right/child/index.mdx')).toEqual({
      root: true,
      title: 'child',
      right: true
    });
    expect(configAt('/other/index.mdx')).toEqual({ isolated: true });
  });

  test.each([false, true])(
    'fallback has no unrelated or previous match, reversed %s',
    async reverse => {
      const pages = [
        { fullPath: '/a/index.mdx', sharedConfig: {} },
        { fullPath: '/a/deep/index.mdx', sharedConfig: {} },
        { fullPath: '/z/index.mdx' },
        { fullPath: '/a/deep/child/index.mdx' },
        { fullPath: '/a/sibling/index.mdx' },
        { fullPath: '/unrelated/end/index.mdx' }
      ];
      if (reverse) pages.reverse();
      const aliases = vi.fn();
      await SharedConfigPlugin.$beforeSend!(
        {
          promises: {
            glob: async () => pages.map(page => page.fullPath),
            readFile: async (path: string) => pages.find(page => page.fullPath === path),
            writeFile: vi.fn()
          }
        } as never,
        {
          ignorePages: [],
          pageExtensions: ['.mdx'],
          config: { setRef: vi.fn(), setAliases: aliases },
          serialiser: { deserialise: async (_path: string, page: unknown) => page }
        } as never,
        { filename: '.shared.json' }
      );
      expect(aliases).toHaveBeenCalledTimes(2);
      expect(aliases).toHaveBeenCalledWith('/a/deep/.shared.json', ['/a/deep/child/.shared.json']);
      expect(aliases).toHaveBeenCalledWith('/a/.shared.json', ['/a/sibling/.shared.json']);
    }
  );
});
