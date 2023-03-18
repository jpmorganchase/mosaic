import path from 'path';
import SidebarPlugin, { SidebarPluginPage } from '../SidebarPlugin';

const folderAPages: string[] = [
  '/folderA/index.mdx',
  '/folderA/pageA.mdx',
  '/folderA/pageB.mdx',
  '/folderA/SubfolderA/index.mdx',
  '/folderA/SubfolderA/PageA.mdx',
  '/folderA/SubfolderA/PageB.mdx'
];

const folderBPages: string[] = ['/folderB/index.mdx', '/folderB/pageA.mdx'];

const folderASidebarContents = {
  pages: [
    {
      id: 'route/folderA/index',
      fullPath: '/folderA/index.mdx',
      name: ' folderA index',
      data: { level: 1, link: 'route/folderA/index' },
      childNodes: [
        {
          id: 'route/folderA/pageA',
          fullPath: '/folderA/pageA.mdx',
          name: ' folderA pageA',
          data: { level: 1, link: 'route/folderA/pageA' },
          childNodes: []
        },
        {
          id: 'route/folderA/pageB',
          fullPath: '/folderA/pageB.mdx',
          name: ' folderA pageB',
          data: { level: 1, link: 'route/folderA/pageB' },
          childNodes: []
        },
        {
          id: 'route/folderA/SubfolderA/index',
          fullPath: '/folderA/SubfolderA/index.mdx',
          name: ' folderA SubfolderA index',
          data: { level: 2, link: 'route/folderA/SubfolderA/index' },
          childNodes: [
            {
              id: 'route/folderA/SubfolderA/PageA',
              fullPath: '/folderA/SubfolderA/PageA.mdx',
              name: ' folderA SubfolderA PageA',
              data: { level: 2, link: 'route/folderA/SubfolderA/PageA' },
              childNodes: []
            },
            {
              id: 'route/folderA/SubfolderA/PageB',
              fullPath: '/folderA/SubfolderA/PageB.mdx',
              name: ' folderA SubfolderA PageB',
              data: { level: 2, link: 'route/folderA/SubfolderA/PageB' },
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
      name: ' folderB index',
      data: { level: 1, link: 'route/folderB/index' },
      childNodes: [
        {
          id: 'route/folderB/pageA',
          fullPath: '/folderB/pageA.mdx',
          name: ' folderB pageA',
          data: { level: 1, link: 'route/folderB/pageA' },
          childNodes: []
        }
      ]
    }
  ]
};

describe('GIVEN the SidebarPlugin', () => {
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
        readFile: jest.fn(value =>
          Promise.resolve({
            fullPath: value,
            route: `route${value.replace(/\..*$/, '')}`,
            title: value
              .split('/')
              .map(pathname => path.basename(pathname, '.mdx'))
              .join(' '),
            layout: 'some layout'
          })
        ),
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
          deserialise: jest.fn().mockImplementation((_path, value) => Promise.resolve(value))
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
