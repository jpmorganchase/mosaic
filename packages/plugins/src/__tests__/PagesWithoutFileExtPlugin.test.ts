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

const setAliasesSpy = jest.fn();
const config = { setAliases: setAliasesSpy };

describe('GIVEN the PagesWithoutFileExtPlugin', () => {
  let updatedPages: Page[] = [];
  test('THEN it should use the `$afterSource` lifecycle event', () => {
    expect(PagesWithoutFileExtPlugin).toHaveProperty('$afterSource');
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
      jest.resetAllMocks();
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
      jest.resetAllMocks();
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
      jest.resetAllMocks();
    });
    test('THEN  **NO** aliases are set', async () => {
      expect(setAliasesSpy).toBeCalledTimes(1);
    });
  });
});
