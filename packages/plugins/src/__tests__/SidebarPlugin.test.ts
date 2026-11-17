import { describe, expect, test, vi } from 'vitest';
import path from 'path';
import SidebarPlugin from '../SidebarPlugin';
import type { SidebarData } from '../utils/sortSidebarData';

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

describe('GIVEN a root folder the SidebarPlugin cannot group', () => {
  const warningsFor = async (pagePaths: string[], excluded: string[] = []) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const volume = {
      promises: {
        glob: vi.fn().mockResolvedValueOnce(['/docs']).mockResolvedValueOnce(pagePaths),
        readFile: vi.fn((value: string) =>
          Promise.resolve({
            fullPath: value,
            route: `route${value.replace(/\..*$/, '')}`,
            title: value,
            ...(excluded.includes(value) ? { sidebar: { exclude: true } } : {})
          })
        ),
        writeFile: vi.fn()
      }
    };
    const run = SidebarPlugin.$beforeSend!;
    await run(
      volume as unknown as Parameters<typeof run>[0],
      {
        config: { setRef: vi.fn() },
        serialiser: { deserialise: (_path: string, value: unknown) => Promise.resolve(value) },
        ignorePages: [],
        pageExtensions: []
      } as unknown as Parameters<typeof run>[1],
      {}
    );
    const messages = warn.mock.calls.map(([message]) => message);
    warn.mockRestore();
    return messages;
  };

  test.each([
    ['it has no pages', [], [], 'it contains no pages'],
    ['its pages are all in subfolders', ['/docs/sub/index.mdx'], [], 'no page sits directly in it']
  ])('WHEN %s THEN the warning says so', async (_case, pagePaths, excluded, reason) => {
    expect(await warningsFor(pagePaths, excluded)).toEqual([
      `[Mosaic][Plugin-Sidebar] - Unable to create a Sidebar grouping for /docs: ${reason}${
        reason.startsWith('no page') ? '; add an index page' : ''
      }`
    ]);
  });
});

describe('GIVEN excluded sidebar pages', () => {
  const page = (file: string, sidebar: Record<string, unknown> = {}) => ({
    fullPath: file,
    route: file.replace(/\.mdx$/, ''),
    title: path.posix.basename(file, '.mdx'),
    sidebar
  });

  async function generate(
    pages: ReturnType<typeof page>[],
    roots = ['/docs'],
    filename = 'sidebar.json'
  ) {
    const setRef = vi.fn();
    const output = new Map<string, { pages: SidebarData[] }>();
    const run = SidebarPlugin.$beforeSend!;
    await run(
      {
        promises: {
          glob: vi.fn(async (_pattern, options) =>
            options.onlyDirectories
              ? roots
              : pages.filter(p => p.fullPath.startsWith(`${options.cwd}/`)).map(p => p.fullPath)
          ),
          readFile: vi.fn(async file => pages.find(p => p.fullPath === file)),
          writeFile: vi.fn(async (file, content) => {
            output.set(file, JSON.parse(content));
          })
        }
      } as unknown as Parameters<typeof run>[0],
      {
        config: { setRef },
        serialiser: { deserialise: (_path, value) => value },
        ignorePages: [],
        pageExtensions: ['.mdx']
      } as unknown as Parameters<typeof run>[1],
      { filename, rootDirGlob: '*' }
    );
    return { output, setRef };
  }

  const links = (nodes: SidebarData[]): string[] =>
    nodes.flatMap(node => (node.kind === 'group' ? links(node.childNodes) : [node.id]));

  test('THEN excluded root and intermediate indexes retain group labels and priority', async () => {
    const pages = [
      page('/docs/index.mdx', { exclude: true }),
      page('/docs/guides/index.mdx', { priority: 10 }),
      page('/docs/components/index.mdx', { exclude: true, groupLabel: 'Components', priority: 50 }),
      page('/docs/components/button.mdx')
    ];
    const { output, setRef } = await generate(pages);
    const tree = output.get('/docs/sidebar.json')!.pages;
    expect(tree.map(node => node.id)).toEqual(['/docs/components', '/docs/guides']);
    expect(tree[0]).toMatchObject({ name: 'Components', priority: 50 });
    expect(links(tree)).toEqual(['/docs/components/button', '/docs/guides/index']);
    expect(setRef).toHaveBeenCalledWith(
      '/docs/components/button.mdx',
      ['navigation', 'next', 'route', '$ref'],
      '/docs/guides/index.mdx#/route'
    );
    expect(setRef).toHaveBeenCalledWith(
      '/docs/guides/index.mdx',
      ['navigation', 'prev', 'route', '$ref'],
      '/docs/components/button.mdx#/route'
    );
    for (const entry of pages) {
      expect(setRef).toHaveBeenCalledWith(
        entry.fullPath,
        ['sidebarData', '$ref'],
        '/docs/sidebar.json/#/pages'
      );
    }
  });

  test('THEN empty excluded groups are pruned and nested visible pages remain navigable', async () => {
    const { output, setRef } = await generate([
      page('/docs/index.mdx', { exclude: true }),
      page('/docs/start.mdx'),
      page('/docs/empty/index.mdx', { exclude: true, priority: 100 }),
      page('/docs/empty/nested/index.mdx', { exclude: true }),
      page('/docs/section/index.mdx', { exclude: true, groupLabel: 'Section' }),
      page('/docs/section/sub/index.mdx', { exclude: true, groupLabel: 'Subsection' }),
      page('/docs/section/sub/hidden.mdx', { exclude: true }),
      page('/docs/section/sub/visible.mdx')
    ]);
    const tree = output.get('/docs/sidebar.json')!.pages;
    expect(links(tree)).toEqual(['/docs/start', '/docs/section/sub/visible']);
    expect(tree.map(node => node.id)).toEqual(['/docs/start', '/docs/section']);
    expect(tree[1]).toMatchObject({ childNodes: [{ name: 'Subsection' }] });
    expect(setRef).toHaveBeenCalledWith(
      '/docs/start.mdx',
      ['navigation', 'next', 'route', '$ref'],
      '/docs/section/sub/visible.mdx#/route'
    );
    expect(setRef).toHaveBeenCalledWith(
      '/docs/section/sub/visible.mdx',
      ['navigation', 'prev', 'route', '$ref'],
      '/docs/start.mdx#/route'
    );
    const navigation = setRef.mock.calls.filter(([, ref]) => ref[0] === 'navigation');
    expect(
      navigation.every(([file, , target]) => !/index\.mdx|hidden\.mdx/.test(`${file} ${target}`))
    ).toBe(true);
  });

  test('THEN an all-excluded root produces an empty tree and refs without navigation', async () => {
    const pages = [
      page('/docs/index.mdx', { exclude: true }),
      page('/docs/sub/index.mdx', { exclude: true })
    ];
    const { output, setRef } = await generate(pages);
    expect(output.get('/docs/sidebar.json')).toEqual({ pages: [] });
    expect(setRef.mock.calls).toEqual(
      pages.map(p => [p.fullPath, ['sidebarData', '$ref'], '/docs/sidebar.json/#/pages'])
    );
  });

  test('THEN namespace roots and a custom output filename remain independent', async () => {
    const { output, setRef } = await generate(
      [
        page('/docs/index.mdx', { exclude: true }),
        page('/docs/page.mdx'),
        page('/other/index.mdx', { exclude: true }),
        page('/other/page.mdx')
      ],
      ['/docs', '/other'],
      'menu.json'
    );
    expect(links(output.get('/docs/menu.json')!.pages)).toEqual(['/docs/page']);
    expect(links(output.get('/other/menu.json')!.pages)).toEqual(['/other/page']);
    expect(setRef.mock.calls.every(([, ref]) => ref[0] === 'sidebarData')).toBe(true);
  });

  test('THEN priority sorting still reaches descendants through single-child groups', async () => {
    const { output } = await generate([
      page('/docs/index.mdx', { exclude: true }),
      page('/docs/section/index.mdx', { exclude: true }),
      page('/docs/section/sub/index.mdx', { exclude: true }),
      page('/docs/section/sub/last.mdx', { priority: 1 }),
      page('/docs/section/sub/first.mdx', { priority: 10 })
    ]);
    expect(links(output.get('/docs/sidebar.json')!.pages)).toEqual([
      '/docs/section/sub/first',
      '/docs/section/sub/last'
    ]);
  });

  test('THEN an excluded index still supplies configured ordering', async () => {
    const root = {
      ...page('/docs/index.mdx', { exclude: true }),
      sharedConfig: { sidebar: { sort: { field: 'title', dataType: 'string', arrange: 'asc' } } }
    };
    const { output } = await generate([root, page('/docs/zebra.mdx'), page('/docs/alpha.mdx')]);
    expect(links(output.get('/docs/sidebar.json')!.pages)).toEqual(['/docs/alpha', '/docs/zebra']);
  });
});
