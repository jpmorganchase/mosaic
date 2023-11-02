type FieldData = string | number;
type SortConfigDataType = 'string' | 'number' | 'date';

export interface SortConfig {
  field: string;
  dataType: SortConfigDataType;
  arrange: 'asc' | 'desc';
}

interface SortConfigWithValue extends SortConfig {
  fieldData: FieldData;
}

export interface SidebarDataNode {
  id: string;
  fullPath: string;
  name: string;
  priority?: number;
  data: { level: number; link: string };
  childNodes: SidebarDataNode[];
  sharedSortConfig?: SortConfigWithValue;
}

function doSort(dataType: SortConfigDataType, a: FieldData, b: FieldData) {
  if (dataType === 'number' || dataType === 'date') {
    return (a as number) - (b as number);
  }
  if (a > b) {
    return 1;
  }
  if (a < b) {
    return -1;
  }
  return 0;
}

function sortBySharedSortConfig(pageA: SidebarDataNode, pageB: SidebarDataNode) {
  if (pageA.sharedSortConfig === undefined || pageB.sharedSortConfig === undefined) {
    return 0;
  }

  if (pageA.sharedSortConfig?.arrange === 'asc') {
    return doSort(
      pageA.sharedSortConfig.dataType,
      pageA.sharedSortConfig.fieldData,
      pageB.sharedSortConfig.fieldData
    );
  }

  return doSort(
    pageB.sharedSortConfig.dataType,
    pageB.sharedSortConfig.fieldData,
    pageA.sharedSortConfig.fieldData
  );
}

export function sortSidebarData(sidebarData: SidebarDataNode[]) {
  const pagesByPriority = sidebarData.map(page => {
    if (page.childNodes?.length > 1) {
      const sortedChildNodes = page.childNodes.sort(
        (pageA, pageB) =>
          (pageB.priority ? pageB.priority : -1) - (pageA.priority ? pageA.priority : -1) ||
          sortBySharedSortConfig(pageA, pageB)
      );
      sortSidebarData(page.childNodes);
      return { ...page, childNodes: sortedChildNodes };
    }
    return page;
  });
  return pagesByPriority;
}
