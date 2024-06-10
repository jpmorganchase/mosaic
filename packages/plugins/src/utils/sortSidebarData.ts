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
}

export type SidebarData = SidebarDataNode | SidebarGroupNode;

export interface SidebarGroupNode {
  id: string;
  kind: 'group';
  childNodes: SidebarData[];
  name: string;
  priority?: number;
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

export function sortSidebarData(sidebarData: SidebarData[]) {
  const pagesByPriority = sidebarData.map(group => {
    if (!isGroupNode(group)) {
      return group;
    }
    if (group?.childNodes?.length > 1) {
      const sortedChildNodes = group.childNodes.sort(
        (pageA, pageB) =>
          (pageB.priority ? pageB.priority : -1) - (pageA.priority ? pageA.priority : -1) ||
          sortBySharedSortConfig(pageA, pageB)
      );
      sortSidebarData(group.childNodes);
      return { ...group, childNodes: sortedChildNodes };
    }
    return group;
  });
  return pagesByPriority;
}
