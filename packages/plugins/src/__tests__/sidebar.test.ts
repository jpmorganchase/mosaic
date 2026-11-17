import { describe, expect, test } from 'vitest';
import { buildSidebarTree, compareSidebarNodes, type SidebarPage } from '../sidebar.js';

interface ComponentPage extends SidebarPage {
  status?: string;
  groupPriority?: number;
}

const page = (route: string, metadata: Partial<ComponentPage> = {}): ComponentPage => ({
  fullPath: `${route}.mdx`,
  route,
  title: route.split('/').at(-1),
  ...metadata
});

describe('reusable sidebar construction', () => {
  test('retains nested groups, custom priorities and page/group badges without changing input', () => {
    const pages = [
      page('/salt/index', { sidebar: { exclude: true } }),
      page('/salt/zebra/index', { title: 'Zebra', groupPriority: 20, sidebar: { priority: 1 } }),
      page('/salt/components/index', {
        title: 'Components',
        groupPriority: 40,
        sidebar: { exclude: true }
      }),
      page('/salt/components/button/index', { title: 'Button', status: 'Release Candidate' }),
      page('/salt/components/button/zebra', { status: 'Release Candidate' }),
      page('/salt/components/button/alpha'),
      page('/salt/components/deep/nested/page'),
      page('/salt/empty/index', { sidebar: { exclude: true } }),
      page('/salt-other/outside')
    ];
    const original = structuredClone(pages);
    const root = buildSidebarTree(pages, {
      rootDir: '/salt/',
      transformPage: (node, source) => ({
        ...node,
        priority: source.route.endsWith('/index') ? 999 : node.priority,
        metadata: { status: source.status }
      }),
      transformGroup: (node, { indexPage }) => ({
        ...node,
        priority: indexPage?.groupPriority ?? node.priority,
        metadata: { status: indexPage?.status }
      }),
      compareNodes: (a, b) => compareSidebarNodes(a, b) || a.name.localeCompare(b.name)
    });
    expect(root.childNodes.map(node => node.name)).toEqual(['Components', 'Zebra']);
    const components = root.childNodes[0];
    expect(components).toMatchObject({
      kind: 'group',
      priority: 40,
      childNodes: [
        {
          name: 'Button',
          metadata: { status: 'Release Candidate' },
          childNodes: [
            { name: 'Button', priority: 999, metadata: { status: 'Release Candidate' } },
            { name: 'alpha' },
            { name: 'zebra', metadata: { status: 'Release Candidate' } }
          ]
        },
        { name: 'deep', childNodes: [{ name: 'nested', childNodes: [{ name: 'page' }] }] }
      ]
    });
    expect(pages).toEqual(original);
  });

  test('uses index sort metadata regardless of input order and honors zero priority', () => {
    const root = buildSidebarTree(
      [
        page('/salt/zebra'),
        page('/salt/alpha'),
        page('/salt/index', {
          sidebar: { priority: 0 },
          sharedConfig: {
            sidebar: { sort: { field: 'title', dataType: 'string', arrange: 'asc' } }
          }
        })
      ],
      { rootDir: '/salt' }
    );
    expect(root.childNodes.map(node => node.name)).toEqual(['index', 'alpha', 'zebra']);
    expect(root.childNodes[0].priority).toBe(0);
  });

  test('returns no tree without a root page, and an empty tree for an excluded root', () => {
    expect(buildSidebarTree([page('/salt/child/page')], { rootDir: '/salt' })).toBeUndefined();
    expect(
      buildSidebarTree([page('/salt/index', { sidebar: { exclude: true } })], {
        rootDir: '/salt'
      })
    ).toMatchObject({ childNodes: [] });
  });
});
