import { useStore } from './store';

export function useTableOfContents() {
  const tableOfContents = useStore(state => state.tableOfContents) || [];
  return {
    tableOfContents
  };
}
