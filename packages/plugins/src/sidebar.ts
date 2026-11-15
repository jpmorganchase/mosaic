import path from 'node:path';
import type { Page } from '@jpmorganchase/mosaic-types';
import { sidebarSortConfigSchema, type SortConfig } from '@jpmorganchase/mosaic-schemas';
import {
  sortSidebarData,
  type SidebarComparator,
  type SidebarDataNode,
  type SidebarGroupNode
} from './utils/sortSidebarData.js';

export {
  compareSidebarNodes,
  isDataNode,
  isGroupNode,
  sortSidebarData,
  type SidebarComparator,
  type SidebarData,
  type SidebarDataNode,
  type SidebarGroupNode
} from './utils/sortSidebarData.js';

export interface SidebarPage extends Page {
  sidebar?: {
    label?: string;
    groupLabel?: string;
    exclude?: boolean;
    priority?: number;
  };
  sharedConfig?: { sidebar?: { sort?: SortConfig } };
}

export interface SidebarTreeOptions<TPage extends SidebarPage = SidebarPage> {
  /** Absolute directory in the virtual filesystem, for example /salt. */
  rootDir: string;
  /** Transform visible page nodes before sorting. The input page is not modified by Mosaic. */
  transformPage?: (node: SidebarDataNode, page: Readonly<TPage>) => SidebarDataNode;
  /** Runs bottom-up, including for excluded indexes and groups with no index page. */
  transformGroup?: (
    node: SidebarGroupNode,
    context: { fullPath: string; indexPage?: Readonly<TPage> }
  ) => SidebarGroupNode;
  /** Replaces the default comparator at every level. See compareSidebarNodes. */
  compareNodes?: SidebarComparator;
}

function sortField(page: SidebarPage, config: SortConfig): string | number {
  let value: unknown = page;
  for (const part of config.field.replace(/^(?:\.\.\/|\.\/)+/, '').split('/')) {
    value =
      value !== null && typeof value === 'object' && Object.hasOwn(value, part)
        ? value[part]
        : undefined;
  }
  switch (config.dataType) {
    case 'date':
      return new Date(value as string).getTime();
    case 'number':
      return Number(value);
    default:
      return String(value);
  }
}

/**
 * Builds a sidebar without reading/writing files or creating references.
 * Pages outside rootDir are ignored. A root needs a page directly within it;
 * excluded pages still establish structure and index metadata. Missing
 * intermediate directories are retained, and empty non-root groups pruned.
 */
export function buildSidebarTree<TPage extends SidebarPage>(
  pages: readonly TPage[],
  { rootDir, transformPage, transformGroup, compareNodes }: SidebarTreeOptions<TPage>
): SidebarGroupNode | undefined {
  const root = path.posix.resolve('/', rootDir);
  const withinRoot = (fullPath: string) => root === '/' || fullPath.startsWith(`${root}/`);
  const included = pages.filter(page => withinRoot(path.posix.resolve('/', page.fullPath)));
  const groups = new Map<
    string,
    { node: SidebarGroupNode; indexPage?: TPage; sort?: SortConfig }
  >();
  const routeOf = (page: TPage) => page.route ?? page.fullPath.replace(/\.[^/.]+$/, '');

  // Collect index metadata first so ordering does not depend on glob order.
  for (const page of included) {
    const fullPath = path.posix.dirname(path.posix.resolve('/', page.fullPath));
    let group = groups.get(fullPath);
    if (!group) {
      group = {
        node: {
          id: path.posix.dirname(routeOf(page)),
          kind: 'group',
          childNodes: [],
          name: path.posix.basename(fullPath)
        }
      };
      groups.set(fullPath, group);
    }
    if (/\/index$/.test(routeOf(page))) {
      group.indexPage = page;
      group.node.name =
        page.sidebar?.groupLabel || page.sidebar?.label || page.title || group.node.name;
      group.node.priority = page.sidebar?.priority;
    }
    const config = page.sharedConfig?.sidebar?.sort;
    if (config) {
      const parsed = sidebarSortConfigSchema.safeParse(config);
      if (parsed.success) group.sort = parsed.data;
      else
        console.error(
          `[Mosaic][Plugin-Sidebar] - Invalid sidebar sort config found in ${page.fullPath}`
        );
    }
  }
  if (!groups.has(root)) return undefined;

  for (const page of included) {
    if (page.sidebar?.exclude) continue;
    const route = routeOf(page);
    const isIndex = /\/index$/.test(route);
    const group = groups.get(path.posix.dirname(path.posix.resolve('/', page.fullPath)));
    const node: SidebarDataNode = {
      id: route,
      kind: 'data',
      fullPath: page.fullPath,
      name: page.sidebar?.label || page.title || path.posix.basename(route),
      priority: isIndex ? page.sidebar?.priority ?? 999 : page.sidebar?.priority,
      data: { level: route.split('/').length - 2, link: route }
    };
    if (!isIndex && group.sort) {
      node.sharedSortConfig = { ...group.sort, fieldData: sortField(page, group.sort) };
    }
    group.node.childNodes.push(transformPage ? transformPage(node, page) : node);
  }

  // A directory need not have its own index for its descendants to remain reachable.
  for (const [fullPath, group] of groups) {
    let parentPath = path.posix.dirname(fullPath);
    let parentId = path.posix.dirname(group.node.id);
    while (parentPath !== root && withinRoot(parentPath)) {
      if (!groups.has(parentPath))
        groups.set(parentPath, {
          node: {
            id: parentId,
            kind: 'group',
            name: path.posix.basename(parentPath),
            childNodes: []
          }
        });
      parentId = path.posix.dirname(parentId);
      parentPath = path.posix.dirname(parentPath);
    }
  }
  let result: SidebarGroupNode;
  const deepestFirst = [...groups.keys()].sort((a, b) => b.split('/').length - a.split('/').length);
  for (const fullPath of deepestFirst) {
    const { node, indexPage } = groups.get(fullPath);
    if (fullPath !== root && node.childNodes.length === 0) continue;
    const transformed = transformGroup ? transformGroup(node, { fullPath, indexPage }) : node;
    if (fullPath === root) result = transformed;
    else groups.get(path.posix.dirname(fullPath)).node.childNodes.push(transformed);
  }
  return sortSidebarData([result], compareNodes)[0] as SidebarGroupNode;
}
