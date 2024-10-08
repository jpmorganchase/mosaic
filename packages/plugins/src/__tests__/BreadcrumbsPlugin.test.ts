import { expect, describe, test, vi, beforeEach } from 'vitest';
import BreadcrumbsPlugin, { BreadcrumbsPluginPage } from '../BreadcrumbsPlugin';

const pages: BreadcrumbsPluginPage[] = [
  {
    fullPath: '/FolderA/index.mdx',
    route: '/route/folderA/index',
    title: 'Folder A Index',
    layout: 'DetailOverview'
  },
  {
    fullPath: '/FolderA/pageA.mdx',
    route: '/route/folderA/pageA',
    title: 'Folder A Page A',
    layout: 'DetailOverview'
  },
  {
    fullPath: '/FolderA/pageB.mdx',
    route: '/route/folderA/pageB',
    title: 'Folder A Page B',
    layout: 'DetailOverview'
  },
  {
    fullPath: '/FolderA/SubfolderA/index.mdx',
    route: '/route/folderA/subfolderA/index',
    title: 'Subfolder A Index',
    layout: 'DetailOverview'
  },
  {
    fullPath: '/FolderA/SubfolderA/PageA.mdx',
    route: '/route/folderA/subfolderA/pageA',
    title: 'Subfolder A Page A',
    layout: 'DetailOverview'
  },
  {
    fullPath: '/FolderA/SubfolderA/PageB.mdx',
    route: '/route/folderA/subfolderA/pageB',
    title: 'Subfolder A Page B',
    layout: 'DetailOverview'
  },
  {
    fullPath: '/FolderA/SubfolderA/PageB.mdx',
    route: '/route/folderA/subfolderA/pageB',
    title: 'Subfolder A Page B',
    layout: 'DetailOverview',
    breadcrumbs: [
      {
        label: 'Label A',
        path: 'path/A',
        id: 'id A'
      },
      {
        label: 'Label B',
        path: 'path/B',
        id: 'id B'
      }
    ]
  }
];

const mutableFsPages = [
  {
    fullPath: '/FolderA/SubfolderA/SubfolderB/index.mdx',
    route: '/route/folderA/subfolderA/SubfolderB/index',
    title: 'Subfolder A Subfolder B Index',
    layout: 'DetailOverview',
    breadcrumbs: [
      {
        label: 'Subfolder B Index',
        path: '/route/folderA/subfolderA/SubfolderB/index',
        id: '/FolderA/SubfolderA/SubfolderB/index.mdx'
      }
    ]
  }
];

let writeFileMock = vi.fn();
const volume = {
  promises: {
    exists: vi.fn(),
    glob: vi.fn().mockResolvedValue(mutableFsPages.map(page => page.fullPath)),
    mkdir: vi.fn(),
    readdir: vi.fn(),
    readFile: vi.fn(value => Promise.resolve(mutableFsPages.find(page => page.fullPath === value))),
    realpath: vi.fn(),
    stat: vi.fn(),
    symlink: vi.fn(),
    unlink: vi.fn(),
    writeFile: writeFileMock
  }
};
const globalVolume = {
  promises: {
    exists: vi.fn().mockResolvedValue(true),
    glob: vi.fn().mockResolvedValue(pages.map(page => page.fullPath)),
    mkdir: vi.fn(),
    readdir: vi.fn(),
    readFile: vi.fn(value => Promise.resolve(mutableFsPages.find(page => page.fullPath === value))),
    realpath: vi.fn(),
    stat: vi.fn(),
    symlink: vi.fn(),
    unlink: vi.fn(),
    writeFile: writeFileMock
  }
};

describe('GIVEN the BreadcrumbsPlugin', () => {
  test('THEN it should use the `$afterSource` lifecycle event', () => {
    expect(BreadcrumbsPlugin).toHaveProperty('$afterSource');
  });

  test('THEN it should use the `afterNamespaceSourceUpdate` lifecycle event', () => {
    expect(BreadcrumbsPlugin).toHaveProperty('afterNamespaceSourceUpdate');
  });

  describe('AND WHEN `$afterSource` is called', () => {
    let updatedPages: BreadcrumbsPluginPage[] = [];
    beforeEach(async () => {
      const $afterSource = BreadcrumbsPlugin.$afterSource;
      updatedPages =
        (await $afterSource?.(
          pages,
          { ignorePages: ['sidebar.json'], pageExtensions: ['.mdx'] },
          { indexPageName: 'index.mdx' }
        )) || [];
    });
    test('THEN breadcrumbs are added', async () => {
      const breadcrumbs = (updatedPages && updatedPages[4].breadcrumbs) || [];

      expect(breadcrumbs.length).toBe(1);
      expect(breadcrumbs[0]).toEqual({
        label: 'Subfolder A Index',
        path: '/route/folderA/subfolderA/index',
        id: '/FolderA/SubfolderA/index.mdx'
      });
    });

    describe('AND WHEN a page already has breadcrumbs', () => {
      test('THEN those breadcrumbs are used', () => {
        const breadcrumbs = (updatedPages && updatedPages[6].breadcrumbs) || [];
        expect(breadcrumbs.length).toBe(2);
        expect(breadcrumbs[0]).toEqual({
          label: 'Label A',
          path: 'path/A',
          id: 'id A'
        });
        expect(breadcrumbs[1]).toEqual({
          label: 'Label B',
          path: 'path/B',
          id: 'id B'
        });
      });
    });
  });

  /**
   * This test requires a bit of setup and understanding
   *
   * The goal is for there to be a file in a mutable filesystem that
   * needs breadcrumbs from the global filesystem.
   *
   * To facilitate this the mutable fs has 1 page which should get the breadcrumbs from the 4th page in the global fs
   *
   * deserialise will be called 3 times by this plugin event so we use mockReturnValueOnce 3 times
   * 1. to read the page from the mutable fs
   * 2. to read the 4th page from the global fs
   * 3. to read the page from the mutable fs again
   *
   */
  describe('AND WHEN `afterNamespaceSourceUpdate` is called', () => {
    let serialiseMock = vi.fn();
    beforeEach(async () => {
      const afterNamespaceSourceUpdate = BreadcrumbsPlugin.afterNamespaceSourceUpdate;

      (await afterNamespaceSourceUpdate?.(
        volume,
        {
          globalFilesystem: globalVolume,
          ignorePages: ['sidebar.json'],
          pageExtensions: ['.mdx'],
          serialiser: {
            deserialise: vi
              .fn()
              .mockResolvedValueOnce(mutableFsPages[0])
              .mockResolvedValueOnce(pages[3])
              .mockResolvedValueOnce(mutableFsPages[0]),
            serialise: serialiseMock
          }
        },
        { indexPageName: 'index.mdx' }
      )) || [];
    });
    test('THEN breadcrumbs from global fs are added', async () => {
      expect(writeFileMock).toBeCalledTimes(1);
      expect(serialiseMock).toBeCalledTimes(1);
      expect(serialiseMock.mock.calls[0][0]).toEqual('/FolderA/SubfolderA/SubfolderB/index.mdx');
      expect(serialiseMock.mock.calls[0][1].breadcrumbs).toEqual([
        {
          label: 'Subfolder A Index',
          path: '/route/folderA/subfolderA/index',
          id: '/FolderA/SubfolderA/index.mdx'
        },
        {
          label: 'Subfolder B Index',
          path: '/route/folderA/subfolderA/SubfolderB/index',
          id: '/FolderA/SubfolderA/SubfolderB/index.mdx'
        }
      ]);
    });
  });
});
