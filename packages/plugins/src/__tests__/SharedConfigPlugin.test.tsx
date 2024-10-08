import { vi, describe, expect, test, beforeEach, afterEach } from 'vitest';
import { Page } from '@jpmorganchase/mosaic-types';
import SharedConfigPlugin from '../SharedConfigPlugin.js';

vi.mock('node:crypto', () => ({
  default: {
    randomUUID: vi.fn(() => '123')
  }
}));

type SharedConfigPage = Page & { sharedConfig?: any };
/**
 * 
 * Folder Hierarchy


Folder A/
├─ Subfolder A/
│  ├─ index.mdx
│  ├─ Page A.mdx
├─ Subfolder B/
│  ├─ Subfolder C/
│  │  ├─ Subfolder D/
│  │  │  ├─ index.mdx
│  ├─ index.mdx
index.mdx
Page A.mdx
Page B.mdx

 * 
 */
const pages: SharedConfigPage[] = [
  {
    fullPath: '/FolderA/index.mdx',
    route: 'route/folderA/index',
    title: 'Folder A Index',
    sharedConfig: {
      shared1: 'shared 1',
      shared2: 'shared 2'
    }
  },
  {
    fullPath: '/FolderA/pageA.mdx',
    route: 'route/folderA/pageA',
    title: 'Folder A Page A'
  },
  {
    fullPath: '/FolderA/pageB.mdx',
    route: 'route/folderA/pageB',
    title: 'Folder A Page B'
  },
  {
    fullPath: '/FolderA/SubfolderA/index.mdx',
    route: 'route/folderA/subfolderA/index',
    title: 'Subfolder A Index',
    sharedConfig: {
      shared2: 'overwritten 2',
      shared3: 'shared 3'
    }
  },
  {
    fullPath: '/FolderA/SubfolderA/PageA.mdx',
    route: 'route/folderA/subfolderA/pageA',
    title: 'Subfolder A Page A'
  },
  {
    fullPath: '/FolderA/SubfolderB/index.mdx',
    route: 'route/folderA/subfolderB/index',
    title: 'Subfolder B Index',
    sharedConfig: {
      shared2: 'overwritten 3'
    }
  },
  {
    fullPath: '/FolderA/SubfolderB/SubfolderC/SubfolderD/index.mdx',
    route: 'route/folderA/subfolderB/subfolderC/subfolderD/index',
    title: 'Subfolder D Index'
  }
];

const pagesWithoutSharedConfig: SharedConfigPage[] = [
  {
    fullPath: '/FolderA/index.mdx',
    route: 'route/folderA/index',
    title: 'Folder A Index'
  },
  {
    fullPath: '/FolderA/pageA.mdx',
    route: 'route/folderA/pageA',
    title: 'Folder A Page A'
  },
  {
    fullPath: '/FolderA/pageB.mdx',
    route: 'route/folderA/pageB',
    title: 'Folder A Page B'
  },
  {
    fullPath: '/FolderA/SubfolderA/index.mdx',
    route: 'route/folderA/subfolderA/index',
    title: 'Subfolder A Index'
  },
  {
    fullPath: '/FolderA/SubfolderA/PageA.mdx',
    route: 'route/folderA/subfolderA/pageA',
    title: 'Subfolder A Page A'
  },
  {
    fullPath: '/FolderA/SubfolderB/index.mdx',
    route: 'route/folderA/subfolderB/index',
    title: 'Subfolder B Index'
  },
  {
    fullPath: '/FolderA/SubfolderB/SubfolderC/SubfolderD/index.mdx',
    route: 'route/folderA/subfolderB/subfolderC/subfolderD/index',
    title: 'Subfolder D Index'
  }
];

let setDataMock = vi.fn();
let setAliasesMock = vi.fn();
let setRefMock = vi.fn();
let writeFileMock = vi.fn();
const volume = {
  promises: {
    exists: vi.fn(),
    glob: vi.fn().mockResolvedValue([
      pages[0].fullPath, // Folder A Index
      pages[3].fullPath, // Subfolder A Index
      pages[5].fullPath, // Subfolder B Index
      pages[6].fullPath // Subfolder D Index
    ]),
    mkdir: vi.fn(),
    readdir: vi.fn(),
    readFile: vi.fn(value => Promise.resolve(pages.find(page => page.fullPath === value))),
    realpath: vi.fn(),
    stat: vi.fn(),
    symlink: vi.fn(),
    unlink: vi.fn(),
    writeFile: writeFileMock
  }
};

describe('GIVEN the SharedConfigPlugin', () => {
  test('THEN it should use the `$afterSource` lifecycle event', () => {
    expect(SharedConfigPlugin).toHaveProperty('$afterSource');
  });

  test('THEN it should use the `$beforeSend` lifecycle event', () => {
    expect(SharedConfigPlugin).toHaveProperty('$beforeSend');
  });

  test('THEN it should use the `afterUpdate` lifecycle event', () => {
    expect(SharedConfigPlugin).toHaveProperty('afterUpdate');
  });

  describe('WHEN `$afterSource` is called', () => {
    let updatedPages: SharedConfigPage[] = [];
    beforeEach(async () => {
      const $afterSource = SharedConfigPlugin.$afterSource;
      // @ts-ignore
      updatedPages =
        (await $afterSource?.(
          pages,
          {
            pageExtensions: ['.mdx'],
            ignorePages: ['shared-config.json']
          },
          { filename: 'shared-config.json' }
        )) || [];
    });
    test('THEN shared config is untouched when there is no parent config', () => {
      expect(updatedPages[0].sharedConfig).toEqual({
        shared1: 'shared 1',
        shared2: 'shared 2'
      });
    });
    test('THEN properties only in the parent shared config are copied to the child shared config', () => {
      expect(updatedPages[3].sharedConfig.shared1).toEqual('shared 1');
    });
    test('THEN child shared config properties will overwrite parent properties with the same name', () => {
      expect(updatedPages[3].sharedConfig.shared2).toEqual('overwritten 2');
    });
    test('THEN properties only present in the child shared config are copied', () => {
      expect(updatedPages[3].sharedConfig.shared3).toEqual('shared 3');
    });
  });

  describe('WHEN `$afterSource` is called and *No* page has a shared config', () => {
    const testNamespace = 'test-ns';
    beforeEach(async () => {
      const $afterSource = SharedConfigPlugin.$afterSource;
      // @ts-ignore

      (await $afterSource?.(
        pagesWithoutSharedConfig,
        {
          pageExtensions: ['.mdx'],
          ignorePages: ['shared-config.json'],
          config: {
            setData: setDataMock
          },
          namespace: testNamespace
        },
        { filename: 'shared-config.json' }
      )) || [];
    });

    afterEach(() => {
      setDataMock.mockReset();
    });

    test('THEN applyNamespaceSharedConfig property is written to the plugin config object', () => {
      expect(setDataMock).toHaveBeenCalledTimes(1);

      const namespaceConfig = setDataMock.mock.calls[0][0];

      expect(namespaceConfig).toEqual({
        applyNamespaceSharedConfig: {
          '123': {
            namespace: 'test-ns',
            paths: [
              '/FolderA/index.mdx',
              '/FolderA/SubfolderA/index.mdx',
              '/FolderA/SubfolderB/index.mdx',
              '/FolderA/SubfolderB/SubfolderC/SubfolderD/index.mdx'
            ],
            rootPath: '/FolderA/index.mdx'
          }
        }
      });
    });

    test('THEN applyNamespaceSharedConfig property has a key that is a combination of namespace and first index page path', () => {
      expect(setDataMock).toHaveBeenCalledTimes(1);

      const namespaceConfig = setDataMock.mock.calls[0][0];

      expect(namespaceConfig.applyNamespaceSharedConfig['123']).toBeDefined();

      expect(namespaceConfig.applyNamespaceSharedConfig['123'].namespace).toEqual(testNamespace);
    });

    test('THEN the namespace is included in the namespace shared config object', () => {
      expect(setDataMock).toHaveBeenCalledTimes(1);

      const namespaceConfig = setDataMock.mock.calls[0][0];

      expect(namespaceConfig.applyNamespaceSharedConfig['123'].namespace).toEqual(testNamespace);
    });

    test('THEN the root path is included in the namespace shared config object', () => {
      expect(setDataMock).toHaveBeenCalledTimes(1);

      const namespaceConfig = setDataMock.mock.calls[0][0];

      expect(namespaceConfig.applyNamespaceSharedConfig['123'].rootPath).toEqual(
        '/FolderA/index.mdx'
      );
    });

    test('THEN all index pages in the source are included in namespace shared config object', () => {
      expect(setDataMock).toHaveBeenCalledTimes(1);

      const namespaceConfig = setDataMock.mock.calls[0][0];

      expect(namespaceConfig.applyNamespaceSharedConfig['123'].paths.length).toEqual(4);

      expect(namespaceConfig.applyNamespaceSharedConfig['123'].paths).toEqual([
        '/FolderA/index.mdx',
        '/FolderA/SubfolderA/index.mdx',
        '/FolderA/SubfolderB/index.mdx',
        '/FolderA/SubfolderB/SubfolderC/SubfolderD/index.mdx'
      ]);
    });
  });

  describe('WHEN `$beforeSend` is called', () => {
    beforeEach(async () => {
      const $beforeSend = SharedConfigPlugin.$beforeSend;
      // @ts-ignore
      (await $beforeSend?.(
        volume,
        {
          config: {
            setRef: setRefMock,
            setAliases: setAliasesMock
          },
          serialiser: {
            deserialise: vi.fn().mockImplementation((_path, value) => Promise.resolve(value))
          },
          ignorePages: [],
          pageExtensions: []
        },
        { filename: 'test-shared-config.json' }
      )) || [];
    });

    afterEach(() => {
      setAliasesMock.mockClear();
      setRefMock.mockClear();
    });

    test('THEN refs to the shared config files are created', () => {
      expect(setRefMock.mock.calls.length).toEqual(3);
      expect(setRefMock.mock.calls[0][0]).toEqual('/FolderA/test-shared-config.json');
      expect(setRefMock.mock.calls[0][1]).toEqual(['config', '$ref']);
      expect(setRefMock.mock.calls[0][2]).toEqual('/FolderA/index.mdx#/sharedConfig');

      expect(setRefMock.mock.calls[1][0]).toEqual('/FolderA/SubfolderA/test-shared-config.json');
      expect(setRefMock.mock.calls[1][1]).toEqual(['config', '$ref']);
      expect(setRefMock.mock.calls[1][2]).toEqual('/FolderA/SubfolderA/index.mdx#/sharedConfig');

      expect(setRefMock.mock.calls[2][0]).toEqual('/FolderA/SubfolderB/test-shared-config.json');
      expect(setRefMock.mock.calls[2][1]).toEqual(['config', '$ref']);
      expect(setRefMock.mock.calls[2][2]).toEqual('/FolderA/SubfolderB/index.mdx#/sharedConfig');
    });

    test('THEN aliases to the created shared config files are created for index pages that do **not** have their own shared config', () => {
      expect(setAliasesMock.mock.calls[0][0]).toEqual(
        '/FolderA/SubfolderB/test-shared-config.json'
      );
    });

    test('THEN aliases point to the closest shared config in the folder hierarchy', () => {
      expect(setAliasesMock.mock.calls.length).toEqual(1);
      expect(setAliasesMock.mock.calls[0][0]).toEqual(
        '/FolderA/SubfolderB/test-shared-config.json'
      );
      expect(setAliasesMock.mock.calls[0][0]).toEqual(
        '/FolderA/SubfolderB/test-shared-config.json'
      );
    });
  });

  describe('WHEN `afterUpdate` is called', () => {
    describe('AND WHEN there is **NO** namespace shared config to apply at all', () => {
      beforeEach(async () => {
        const afterUpdate = SharedConfigPlugin.afterUpdate;
        // @ts-ignore
        (await afterUpdate?.(
          volume,
          {
            config: {
              setRef: setRefMock,
              setAliases: setAliasesMock
            },
            serialiser: {
              deserialise: vi.fn().mockImplementation((_path, value) => Promise.resolve(value))
            },
            globalConfig: { data: {} },
            ignorePages: [],
            pageExtensions: []
          },
          { filename: 'test-shared-config.json' }
        )) || [];
      });

      test('THEN no action is taken', () => {
        expect(volume.promises.exists).not.toBeCalled();
      });
    });

    describe('AND WHEN there is **NO** namespace shared config to apply for the namespace', () => {
      beforeEach(async () => {
        const afterUpdate = SharedConfigPlugin.afterUpdate;
        // @ts-ignore
        (await afterUpdate?.(
          volume,
          {
            config: {
              setRef: setRefMock,
              setAliases: setAliasesMock
            },
            serialiser: {
              deserialise: vi.fn().mockImplementation((_path, value) => Promise.resolve(value))
            },
            globalConfig: {
              data: { applyNamespaceSharedConfig: { ['another-ns']: { data: 'data' } } }
            },
            ignorePages: [],
            pageExtensions: [],
            namespace: 'test-ns'
          },
          { filename: 'test-shared-config.json' }
        )) || [];
      });

      test('THEN no action is taken', () => {
        expect(volume.promises.exists).not.toBeCalled();
      });
    });

    describe('AND WHEN there is namespace shared config to apply for the namespace BUT the rootPath is part of this source', () => {
      beforeEach(async () => {
        const afterUpdate = SharedConfigPlugin.afterUpdate;

        volume.promises.exists.mockResolvedValue(true);

        // @ts-ignore
        (await afterUpdate?.(
          volume,
          {
            config: {
              setRef: setRefMock,
              setAliases: setAliasesMock
            },
            serialiser: {
              deserialise: vi.fn().mockImplementation((_path, value) => Promise.resolve(value))
            },
            globalConfig: {
              data: {
                applyNamespaceSharedConfig: {
                  'test-ns~~/FolderY/index.mdx': {
                    namespace: 'test-ns',
                    paths: ['/FolderY/index.mdx', '/FolderY/SubfolderX/index.mdx'],
                    rootPath: '/FolderY/index.mdx'
                  }
                }
              }
            },
            ignorePages: [],
            pageExtensions: [],
            namespace: 'test-ns'
          },
          { filename: 'test-shared-config.json' }
        )) || [];
      });

      afterEach(() => {
        volume.promises.exists.mockReset();
      });

      test('THEN we check for existence of the root path', () => {
        expect(volume.promises.exists).toHaveBeenCalledTimes(1);
        expect(volume.promises.exists.mock.calls[0][0]).toEqual('/FolderY/index.mdx');
      });

      test('THEN we do *NOT* write out any new shared config file', () => {
        expect(volume.promises.exists).toHaveBeenCalledTimes(1);
        expect(volume.promises.exists.mock.calls[0][0]).toEqual('/FolderY/index.mdx');
      });
    });

    describe('AND WHEN there is namespace shared config to apply for the namespace AND the rootPath is **NOT** part of this source', () => {
      const sharedFilesystem = {
        promises: {
          exists: vi.fn(),
          mkdir: vi.fn(),
          readdir: vi.fn(),
          readFile: vi.fn(),
          realpath: vi.fn(),
          stat: vi.fn(),
          symlink: vi.fn(),
          unlink: vi.fn(),
          writeFile: vi.fn()
        }
      };
      beforeEach(async () => {
        const afterUpdate = SharedConfigPlugin.afterUpdate;
        volume.promises.readFile.mockReset();
        volume.promises.exists.mockResolvedValueOnce(false).mockResolvedValue(true);
        sharedFilesystem.promises.exists.mockResolvedValue(false);

        // @ts-ignore
        (await afterUpdate?.(
          volume,
          {
            sharedFilesystem,
            config: {
              setRef: setRefMock,
              setAliases: setAliasesMock
            },
            serialiser: {
              deserialise: vi.fn().mockImplementation((_path, value) => Promise.resolve(value))
            },
            globalConfig: {
              data: {
                applyNamespaceSharedConfig: {
                  'test-ns~~/FolderY/index.mdx': {
                    namespace: 'test-ns',
                    paths: ['/FolderY/index.mdx'],
                    rootPath: '/FolderY/index.mdx'
                  }
                }
              }
            },
            ignorePages: [],
            pageExtensions: [],
            namespace: 'test-ns'
          },
          { filename: 'test-shared-config.json' }
        )) || [];
      });

      afterEach(() => {
        volume.promises.exists.mockReset();
        sharedFilesystem.promises.exists.mockReset();
        volume.promises.readFile.mockReset();
      });

      test('THEN we check the shared config json file exists in the mutable fs and the target shared config is not in the shared filesystem', () => {
        expect(sharedFilesystem.promises.exists.mock.calls[0][0]).toEqual('/FolderY/index.mdx');
        expect(sharedFilesystem.promises.mkdir.mock.calls[0][0]).toEqual('/FolderY');

        expect(volume.promises.exists.mock.calls[1][0]).toEqual('/test-shared-config.json');

        expect(sharedFilesystem.promises.writeFile).toBeCalledTimes(1);
        expect(sharedFilesystem.promises.writeFile.mock.calls[0][0]).toEqual(
          '/FolderY/test-shared-config.json'
        );
        expect(volume.promises.readFile).toBeCalledTimes(1);
        expect(volume.promises.readFile.mock.calls[0][0]).toEqual('/test-shared-config.json');
      });
    });
  });
});
