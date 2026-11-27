import { expect, describe, test, vi, beforeEach, afterEach } from 'vitest';
import type { Page } from '@jpmorganchase/mosaic-types';
import PagesWithoutFileExtPlugin from '../PagesWithoutFileExtPlugin';

const pages: Page[] = [
  {
    fullPath: '/FolderA/index.mdx',
    route: 'route/folderA/index.mdx',
    title: 'Folder A Index'
  },
  {
    fullPath: '/FolderA/pageA.mdx',
    route: 'route/folderA/pageA.mdx',
    title: 'Folder A Page A'
  }
];

const setAliasesSpy = vi.fn();
const config = { setAliases: setAliasesSpy };

describe('GIVEN the PagesWithoutFileExtPlugin', () => {
  let updatedPages: Page[] = [];
  test('THEN it should use the `$afterSource` lifecycle event', () => {
    expect(PagesWithoutFileExtPlugin).toHaveProperty('$afterSource');
  });

  test('THEN a literal percent filename and an escaped permalink resolve to distinct aliases', async () => {
    const setAliases = vi.fn();
    const afterSource = PagesWithoutFileExtPlugin.$afterSource!;
    const result = await afterSource(
      [
        { fullPath: '/docs/guide%20name.mdx', route: '/docs/guide%20name.mdx', title: 'Literal' },
        { fullPath: '/docs/guide.mdx', route: '/docs/guide%20name', title: 'Authored' }
      ],
      {
        config: { setAliases },
        ignorePages: [],
        pageExtensions: ['.mdx']
      } as Parameters<typeof afterSource>[1],
      {}
    );
    expect(setAliases.mock.calls).toEqual([
      ['/docs/guide%20name.mdx', ['/docs/guide%20name']],
      ['/docs/guide.mdx', ['/docs/guide name']]
    ]);
    expect(result?.map(page => page.route)).toEqual(['/docs/guide%20name', '/docs/guide%20name']);
  });

  test('THEN the longest extension determines source filename provenance', async () => {
    const setAliases = vi.fn();
    const afterSource = PagesWithoutFileExtPlugin.$afterSource!;
    const result = await afterSource(
      [
        {
          fullPath: '/docs/guide%20name.page.mdx',
          route: '/docs/guide%20name.page.mdx',
          title: 'Literal'
        },
        {
          fullPath: '/docs/setup%20notes.page.mdx',
          route: '/docs/setup%20notes.page',
          title: 'Authored'
        }
      ],
      {
        config: { setAliases },
        ignorePages: [],
        pageExtensions: ['.mdx', '.page.mdx']
      } as Parameters<typeof afterSource>[1],
      {}
    );
    expect(setAliases.mock.calls).toEqual([
      ['/docs/guide%20name.page.mdx', ['/docs/guide%20name']],
      ['/docs/setup%20notes.page.mdx', ['/docs/setup notes.page']]
    ]);
    expect(result?.map(page => page.routeUsesSourceFilename)).toEqual([true, false]);
  });

  describe('AND WHEN pages have an extension we want', () => {
    const pageExtensions = ['.mdx', '.json', '.md'];
    const ignorePages = ['shared-config.json', 'sitemap.xml', 'sidebar.json'];
    beforeEach(async () => {
      const $afterSource = PagesWithoutFileExtPlugin.$afterSource;
      // @ts-ignore
      updatedPages =
        (await $afterSource?.(pages, { config, ignorePages, pageExtensions }, {})) || [];
    });
    afterEach(() => {
      vi.resetAllMocks();
    });
    test('THEN aliases are created for each page', async () => {
      expect(setAliasesSpy).toBeCalledTimes(pages.length);
      expect(setAliasesSpy.mock.calls[0][0]).toEqual(pages[0].fullPath);
      expect(setAliasesSpy.mock.calls[0][1]).toEqual(['route/folderA/index']);
      expect(setAliasesSpy.mock.calls[1][0]).toEqual(pages[1].fullPath);
      expect(setAliasesSpy.mock.calls[1][1]).toEqual(['route/folderA/pageA']);
    });

    test('THEN a friendly page route is created', async () => {
      expect(updatedPages[0].route).toEqual('route/folderA/index');
      expect(updatedPages[1].route).toEqual('route/folderA/pageA');
    });
  });

  describe('AND WHEN pages use ignored extensions', () => {
    const pageExtensions = ['.json'];
    const ignorePages = ['shared-config.json', 'sitemap.xml', 'sidebar.json'];
    beforeEach(async () => {
      const $afterSource = PagesWithoutFileExtPlugin.$afterSource;
      // @ts-ignore
      updatedPages =
        (await $afterSource?.(pages, { config, ignorePages, pageExtensions }, {})) || [];
    });
    afterEach(() => {
      vi.resetAllMocks();
    });
    test('THEN  **NO** aliases are set', async () => {
      expect(setAliasesSpy).toBeCalledTimes(0);
    });
  });

  describe('AND WHEN a page itself is ignored', () => {
    const pageExtensions = ['.mdx'];
    const ignorePages = ['pageA.mdx'];
    beforeEach(async () => {
      const $afterSource = PagesWithoutFileExtPlugin.$afterSource;
      // @ts-ignore
      updatedPages =
        (await $afterSource?.(pages, { config, ignorePages, pageExtensions }, {})) || [];
    });
    afterEach(() => {
      vi.resetAllMocks();
    });
    test('THEN  **NO** aliases are set', async () => {
      expect(setAliasesSpy).toBeCalledTimes(1);
    });
  });
});
