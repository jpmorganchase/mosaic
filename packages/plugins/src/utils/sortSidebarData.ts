import type { SortConfig } from '@jpmorganchase/mosaic-schemas';

type FieldData = string | number;
interface SortConfigWithValue extends SortConfig {
  fieldData: FieldData;
}

export interface SidebarDataNode {
  kind: 'data';
  id: string;
  fullPath: string;
  name: string;
  priority?: number;
  data: { level: number; link: string };
  sharedSortConfig?: SortConfigWithValue;
  /** Consumer metadata, for example a component status badge. */
  metadata?: Record<string, unknown>;
}

export type SidebarData = SidebarDataNode | SidebarGroupNode;

export interface SidebarGroupNode {
  id: string;
  kind: 'group';
  childNodes: SidebarData[];
  name: string;
  priority?: number;
  metadata?: Record<string, unknown>;
}

export function isGroupNode(node: SidebarDataNode | SidebarGroupNode): node is SidebarGroupNode {
  return node.kind === 'group';
}
export function isDataNode(node: SidebarDataNode | SidebarGroupNode): node is SidebarDataNode {
  return node.kind === 'data';
}

const isNumber = (fieldData: FieldData): fieldData is number => typeof fieldData === 'number';

function doSort(a: FieldData, b: FieldData) {
  if (isNumber(a) && isNumber(b)) {
    return a - b;
  }
  if (a > b) {
    return 1;
  }
  if (a < b) {
    return -1;
  }
  return 0;
}

function sortBySharedSortConfig(nodeA: SidebarData, nodeB: SidebarData) {
  if (!isDataNode(nodeA) || !isDataNode(nodeB)) {
    return 0;
  }
  if (nodeA.sharedSortConfig === undefined || nodeB.sharedSortConfig === undefined) {
    return 0;
  }
  if (nodeA.sharedSortConfig?.arrange === 'asc') {
    return doSort(nodeA.sharedSortConfig.fieldData, nodeB.sharedSortConfig.fieldData);
  }
  return doSort(nodeB.sharedSortConfig.fieldData, nodeA.sharedSortConfig.fieldData);
}

/** The default ordering, reusable as the first part of a custom comparator. */
export function compareSidebarNodes(pageA: SidebarData, pageB: SidebarData): number {
  return (pageB.priority ?? -1) - (pageA.priority ?? -1) || sortBySharedSortConfig(pageA, pageB);
}

export type SidebarComparator = (
  a: SidebarData,
  b: SidebarData,
  parent: SidebarGroupNode
) => number;

export function sortSidebarData(
  sidebarData: SidebarData[],
  compare: SidebarComparator = compareSidebarNodes
) {
  const pagesByPriority = sidebarData.map(group => {
    if (!isGroupNode(group)) {
      return group;
    }
    // Even a single child can be a group whose descendants need sorting.
    if (group?.childNodes?.length > 0) {
      const sortedChildNodes = sortSidebarData(group.childNodes, compare).sort((pageA, pageB) =>
        compare(pageA, pageB, group)
      );
      return { ...group, childNodes: sortedChildNodes };
    }
    return group;
  });
  return pagesByPriority;
}
