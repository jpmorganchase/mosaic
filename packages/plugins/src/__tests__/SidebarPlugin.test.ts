import { describe, expect, test, vi } from 'vitest';
import path from 'path';
import SidebarPlugin from '../SidebarPlugin';

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
      kind: 'data',
      fullPath: '/folderA/index.mdx',
      name: ' folderA index',
      priority: 999,
      data: { level: 1, link: 'route/folderA/index' }
    },
    {
      id: 'route/folderA/pageA',
      kind: 'data',
      fullPath: '/folderA/pageA.mdx',
      name: ' folderA pageA',
      data: { level: 1, link: 'route/folderA/pageA' }
    },
    {
      id: 'route/folderA/pageB',
      kind: 'data',
      fullPath: '/folderA/pageB.mdx',
      name: ' folderA pageB',
      data: { level: 1, link: 'route/folderA/pageB' }
    },
    {
      id: 'route/folderA/SubfolderA',
      kind: 'group',
      childNodes: [
        {
          id: 'route/folderA/SubfolderA/index',
          kind: 'data',
          fullPath: '/folderA/SubfolderA/index.mdx',
          name: ' folderA SubfolderA index',
          priority: 999,
          data: { level: 2, link: 'route/folderA/SubfolderA/index' }
        },
        {
          id: 'route/folderA/SubfolderA/PageA',
          kind: 'data',
          fullPath: '/folderA/SubfolderA/PageA.mdx',
          name: ' folderA SubfolderA PageA',
          data: { level: 2, link: 'route/folderA/SubfolderA/PageA' }
        },
        {
          id: 'route/folderA/SubfolderA/PageB',
          kind: 'data',
          fullPath: '/folderA/SubfolderA/PageB.mdx',
          name: ' folderA SubfolderA PageB',
          data: { level: 2, link: 'route/folderA/SubfolderA/PageB' }
        }
      ],
      name: ' folderA SubfolderA index'
    }
  ]
};

const folderBSidebarContents = {
  pages: [
    {
      id: 'route/folderB/index',
      kind: 'data',
      fullPath: '/folderB/index.mdx',
      name: ' folderB index',
      priority: 999,
      data: { level: 1, link: 'route/folderB/index' }
    },
    {
      id: 'route/folderB/pageA',
      kind: 'data',
      fullPath: '/folderB/pageA.mdx',
      name: ' folderB pageA',
      data: { level: 1, link: 'route/folderB/pageA' }
    }
  ]
};

describe('GIVEN the SidebarPlugin', () => {
  test('THEN it should use the `$beforeSend` lifecycle event', async () => {
    // arrange
    let setRefMock = vi.fn();
    let writeFileMock = vi.fn();
    const volume = {
      promises: {
        exists: vi.fn().mockResolvedValue(true),
        glob: vi
          .fn()
          .mockResolvedValueOnce(['/folderA', '/folderB'])
          .mockResolvedValueOnce(folderAPages)
          .mockResolvedValueOnce(folderBPages),
        mkdir: vi.fn(),
        readdir: vi.fn(),
        readFile: vi.fn(value =>
          Promise.resolve({
            fullPath: value,
            route: `route${value.replace(/\..*$/, '')}`,
            title: value
              .split('/')
              .map((pathname: string) => path.basename(pathname, '.mdx'))
              .join(' '),
            layout: 'some layout'
          })
        ),
        realpath: vi.fn(),
        stat: vi.fn(),
        symlink: vi.fn(),
        unlink: vi.fn(),
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
          deserialise: vi.fn().mockImplementation((_path, value) => Promise.resolve(value))
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
    expect(setRefMock).toHaveBeenCalledTimes(37);
    // assert
    // - folderA
    //   - index.mdx
    //   - pageA.mdx
    //   - pageB.mdx
    //   - SubfolderA
    //     - index.mdx
    //     - PageA.mdx
    //     - PageB.mdx
    // next -> prev pages refs are set to create to the next/prev user journeys
    expect(setRefMock).toHaveBeenNthCalledWith(
      1,
      '/folderA/index.mdx',
      ['navigation', 'next', 'title', '$ref'],
      '/folderA/pageA.mdx#/title'
    );
    expect(setRefMock).toHaveBeenNthCalledWith(
      3,
      '/folderA/pageA.mdx',
      ['navigation', 'prev', 'title', '$ref'],
      '/folderA/index.mdx#/title'
    );
    expect(setRefMock).toHaveBeenNthCalledWith(
      5,
      '/folderA/pageA.mdx',
      ['navigation', 'next', 'title', '$ref'],
      '/folderA/pageB.mdx#/title'
    );
    expect(setRefMock).toHaveBeenNthCalledWith(
      7,
      '/folderA/pageB.mdx',
      ['navigation', 'prev', 'title', '$ref'],
      '/folderA/pageA.mdx#/title'
    );
    expect(setRefMock).toHaveBeenNthCalledWith(
      9,
      '/folderA/pageB.mdx',
      ['navigation', 'next', 'title', '$ref'],
      '/folderA/SubfolderA/index.mdx#/title'
    );
    expect(setRefMock).toHaveBeenNthCalledWith(
      11,
      '/folderA/pageB.mdx',
      ['navigation', 'next', 'group', '$ref'],
      '/folderA/SubfolderA#/sidebar/groupLabel'
    );
    expect(setRefMock).toHaveBeenNthCalledWith(
      12,
      '/folderA/SubfolderA/index.mdx',
      ['navigation', 'prev', 'title', '$ref'],
      '/folderA/pageB.mdx#/title'
    );
    expect(setRefMock).toHaveBeenNthCalledWith(
      14,
      '/folderA/SubfolderA/index.mdx',
      ['navigation', 'next', 'title', '$ref'],
      '/folderA/SubfolderA/PageA.mdx#/title'
    );
    expect(setRefMock).toHaveBeenNthCalledWith(
      16,
      '/folderA/SubfolderA/index.mdx',
      ['navigation', 'next', 'group', '$ref'],
      '/folderA/SubfolderA#/sidebar/groupLabel'
    );
    expect(setRefMock).toHaveBeenNthCalledWith(
      17,
      '/folderA/SubfolderA/PageA.mdx',
      ['navigation', 'prev', 'title', '$ref'],
      '/folderA/SubfolderA/index.mdx#/title'
    );
    expect(setRefMock).toHaveBeenNthCalledWith(
      19,
      '/folderA/SubfolderA/PageA.mdx',
      ['navigation', 'prev', 'group', '$ref'],
      '/folderA/SubfolderA#/sidebar/groupLabel'
    );
    expect(setRefMock).toHaveBeenNthCalledWith(
      20,
      '/folderA/SubfolderA/PageA.mdx',
      ['navigation', 'next', 'title', '$ref'],
      '/folderA/SubfolderA/PageB.mdx#/title'
    );
    expect(setRefMock).toHaveBeenNthCalledWith(
      22,
      '/folderA/SubfolderA/PageA.mdx',
      ['navigation', 'next', 'group', '$ref'],
      '/folderA/SubfolderA#/sidebar/groupLabel'
    );
    expect(setRefMock).toHaveBeenNthCalledWith(
      23,
      '/folderA/SubfolderA/PageB.mdx',
      ['navigation', 'prev', 'title', '$ref'],
      '/folderA/SubfolderA/PageA.mdx#/title'
    );
    expect(setRefMock).toHaveBeenNthCalledWith(
      25,
      '/folderA/SubfolderA/PageB.mdx',
      ['navigation', 'prev', 'group', '$ref'],
      '/folderA/SubfolderA#/sidebar/groupLabel'
    );
    // assert
    // - folderB
    //   - index.mdx
    //   - pageA.mdx
    // next -> prev pages refs are set to create to the next/prev user journeys
    expect(setRefMock).toHaveBeenNthCalledWith(
      27,
      '/folderB/index.mdx',
      ['navigation', 'next', 'route', '$ref'],
      '/folderB/pageA.mdx#/route'
    );
    expect(setRefMock).toHaveBeenNthCalledWith(
      29,
      '/folderB/pageA.mdx',
      ['navigation', 'prev', 'route', '$ref'],
      '/folderB/index.mdx#/route'
    );
    // assert
    // The sidebar sidebar refs are set
    expect(setRefMock).toHaveBeenNthCalledWith(
      30,
      '/folderA/index.mdx',
      ['sidebarData', '$ref'],
      '/folderA/test-sidebar.json/#/pages'
    );
    expect(setRefMock).toHaveBeenNthCalledWith(
      36,
      '/folderB/index.mdx',
      ['sidebarData', '$ref'],
      '/folderB/test-sidebar.json/#/pages'
    );
  });
});
