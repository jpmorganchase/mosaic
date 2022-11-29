import { useStore } from './store';

export type { TableOfContentsItem } from './types';

export function useTableOfContents() {
  const tableOfContents = useStore(state => state.tableOfContents) || [];
  return {
    tableOfContents
  };
}
