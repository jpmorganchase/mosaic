import { expect, describe, test, beforeEach } from 'vitest';
import ReadingTimePlugin, { type ReadingTimePluginPage } from '../ReadingTimePlugin';

let updatedPages: ReadingTimePluginPage[] = [];
const $afterSource = ReadingTimePlugin.$afterSource;

describe('GIVEN the ReadingTimePlugin', () => {
  test('THEN it should use the `$afterSource` lifecycle event', () => {
    expect(ReadingTimePlugin).toHaveProperty('$afterSource');
  });

  describe('AND WHEN pages have the `.mdx` extension', () => {
    const ignorePages = ['shared-config.json', 'sitemap.xml', 'sidebar.json'];
    const pageExtensions = ['.mdx', '.json', '.md'];
    beforeEach(async () => {
      updatedPages =
        (await $afterSource?.(
          [
            {
              fullPath: '/FolderA/index.mdx',
              route: 'route/folderA/index.mdx',
              title: 'Folder A Index'
            },
            {
              fullPath: '/FolderA/pageA.json',
              route: 'route/folderA/pageA.json',
              title: 'Folder A Page A'
            }
          ],
          { ignorePages, pageExtensions },
          {}
        )) || [];
    });

    test('THEN the reading time is calculated', () => {
      expect(updatedPages[0].readingTime).toBeDefined();
      expect(updatedPages[1].readingTime).not.toBeDefined();
    });
  });

  describe('AND WHEN `.mdx` is not a configured page extension', () => {
    const ignorePages = ['shared-config.json', 'sitemap.xml', 'sidebar.json'];
    const pageExtensions = ['.json'];
    beforeEach(async () => {
      updatedPages =
        // @ts-ignore
        (await $afterSource?.(
          [
            {
              fullPath: '/FolderA/index.mdx',
              route: 'route/folderA/index.mdx',
              title: 'Folder A Index'
            },
            {
              fullPath: '/FolderA/pageA.json',
              route: 'route/folderA/pageA.json',
              title: 'Folder A Page A'
            }
          ],
          { ignorePages, pageExtensions },
          {}
        )) || [];
    });

    test('THEN no page has the reading time metadata', () => {
      expect(updatedPages[0].readingTime).not.toBeDefined();
      expect(updatedPages[1].readingTime).not.toBeDefined();
    });
  });

  describe('AND WHEN a page itself is ignored', () => {
    const pageExtensions = ['.mdx'];
    const ignorePages = ['index.mdx'];
    beforeEach(async () => {
      updatedPages =
        (await $afterSource?.(
          [
            {
              fullPath: '/FolderA/index.mdx',
              route: 'route/folderA/index.mdx',
              title: 'Folder A Index'
            },

            {
              fullPath: '/FolderA/pageA.json',
              route: 'route/folderA/pageA.json',
              title: 'Folder A Page A'
            }
          ],
          { ignorePages, pageExtensions },
          {}
        )) || [];
    });

    test('THEN no page has the reading time metadata', () => {
      expect(updatedPages[0].readingTime).not.toBeDefined();
      expect(updatedPages[1].readingTime).not.toBeDefined();
    });
  });
});
