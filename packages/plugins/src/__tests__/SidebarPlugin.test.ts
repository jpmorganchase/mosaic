import SidebarPlugin, { SidebarPluginPage } from '../SidebarPlugin';

const folderAPages: SidebarPluginPage[] = [
  {
    fullPath: '/folderA/index.mdx',
    route: 'route/folderA/index',
    title: 'Folder A Index',
    layout: 'DetailOverview'
  },
  {
    fullPath: '/folderA/pageA.mdx',
    route: 'route/folderA/pageA',
    title: 'Folder A Page A',
    layout: 'DetailOverview'
  },
  {
    fullPath: '/folderA/pageB.mdx',
    route: 'route/folderA/pageB',
    title: 'Folder A Page B',
    layout: 'DetailOverview'
  },
  {
    fullPath: '/folderA/SubfolderA/index.mdx',
    route: 'route/folderA/subfolderA/index',
    title: 'Subfolder A Index',
    layout: 'DetailOverview'
  },
  {
    fullPath: '/folderA/SubfolderA/PageA.mdx',
    route: 'route/folderA/subfolderA/pageA',
    title: 'Subfolder A Page A',
    layout: 'DetailOverview'
  },
  {
    fullPath: '/folderA/SubfolderA/PageB.mdx',
    route: 'route/folderA/subfolderA/pageB',
    title: 'Subfolder A Page B',
    layout: 'DetailOverview'
  }
];
const folderBPages: SidebarPluginPage[] = [
  {
    fullPath: '/folderB/index.mdx',
    route: 'route/folderB/index',
    title: 'Folder B Index',
    layout: 'DetailOverview'
  },
  {
    fullPath: '/folderB/pageA.mdx',
    route: 'route/folderA/pageA',
    title: 'Folder B Page A',
    layout: 'DetailOverview'
  }
];

const folderASidebarContents = {
  pages: [
    {
      id: 'route/folderA/index',
      fullPath: '/folderA/index.mdx',
      name: 'Folder A Index',
      data: { level: 1, link: 'route/folderA/index' },
      childNodes: [
        {
          id: 'route/folderA/pageA',
          fullPath: '/folderA/pageA.mdx',
          name: 'Folder A Page A',
          data: { level: 1, link: 'route/folderA/pageA' },
          childNodes: []
        },
        {
          id: 'route/folderA/pageB',
          fullPath: '/folderA/pageB.mdx',
          name: 'Folder A Page B',
          data: { level: 1, link: 'route/folderA/pageB' },
          childNodes: []
        },
        {
          id: 'route/folderA/subfolderA/index',
          fullPath: '/folderA/SubfolderA/index.mdx',
          name: 'Subfolder A Index',
          data: { level: 2, link: 'route/folderA/subfolderA/index' },
          childNodes: [
            {
              id: 'route/folderA/subfolderA/pageA',
              fullPath: '/folderA/SubfolderA/PageA.mdx',
              name: 'Subfolder A Page A',
              data: { level: 2, link: 'route/folderA/subfolderA/pageA' },
              childNodes: []
            },
            {
              id: 'route/folderA/subfolderA/pageB',
              fullPath: '/folderA/SubfolderA/PageB.mdx',
              name: 'Subfolder A Page B',
              data: { level: 2, link: 'route/folderA/subfolderA/pageB' },
              childNodes: []
            }
          ]
        }
      ]
    }
  ]
};

const folderBSidebarContents = {
  pages: [
    {
      id: 'route/folderB/index',
      fullPath: '/folderB/index.mdx',
      name: 'Folder B Index',
      data: { level: 1, link: 'route/folderB/index' },
      childNodes: [
        {
          id: 'route/folderA/pageA',
          fullPath: '/folderB/pageA.mdx',
          name: 'Folder B Page A',
          data: { level: 1, link: 'route/folderA/pageA' },
          childNodes: []
        }
      ]
    }
  ]
};

describe.only('GIVEN the SidebarPlugin', () => {
  test('THEN it should use the `$beforeSend` lifecycle event', async () => {
    // arrange
    let setRefMock = jest.fn();
    let writeFileMock = jest.fn();
    const volume = {
      promises: {
        exists: jest.fn().mockResolvedValue(true),
        glob: jest
          .fn()
          .mockResolvedValueOnce(['/folderA', '/folderB'])
          .mockResolvedValueOnce(folderAPages)
          .mockResolvedValueOnce(folderBPages),
        mkdir: jest.fn(),
        readdir: jest.fn(),
        readFile: jest.fn(),
        realpath: jest.fn(),
        stat: jest.fn(),
        symlink: jest.fn(),
        unlink: jest.fn(),
        writeFile: writeFileMock
      }
    };
    // action
    const $beforeSend = SidebarPlugin.$beforeSend;
    // @ts-ignore
    (await $beforeSend?.(
      volume,
      {
        config: {
          setRef: setRefMock
        },
        serialiser: {
          deserialise: jest.fn().mockImplementation(value => Promise.resolve(value))
        },
        ignorePages: [],
        pageExtensions: []
      },
      { filename: 'test-sidebar.json' }
    )) || [];
    // assert
    // The sidebar file is created for folderA
    expect(writeFileMock).toHaveBeenCalledTimes(2);
    expect(writeFileMock).toHaveBeenNthCalledWith(
      1,
      '/folderA/test-sidebar.json',
      JSON.stringify(folderASidebarContents)
    );
    // The sidebar file is created for folderB
    expect(writeFileMock).toHaveBeenNthCalledWith(
      2,
      '/folderB/test-sidebar.json',
      JSON.stringify(folderBSidebarContents)
    );
    // The sidebar navigation refs are set
    expect(setRefMock).toHaveBeenCalledTimes(28);
    expect(setRefMock).toHaveBeenNthCalledWith(
      1,
      '/folderA/index.mdx',
      ['navigation', 'next', 'title', '$ref'],
      '/folderA/pageA.mdx#/title'
    );
    expect(setRefMock).toHaveBeenNthCalledWith(
      19,
      '/folderB/index.mdx',
      ['navigation', 'next', 'title', '$ref'],
      '/folderB/pageA.mdx#/title'
    );
    // The sidebar sidebar refs are set
    expect(setRefMock).toHaveBeenNthCalledWith(
      21,
      '/folderA/index.mdx',
      ['sidebarData', '$ref'],
      '/folderA/test-sidebar.json/#/pages'
    );
    expect(setRefMock).toHaveBeenNthCalledWith(
      27,
      '/folderB/index.mdx',
      ['sidebarData', '$ref'],
      '/folderB/test-sidebar.json/#/pages'
    );
  });
});
