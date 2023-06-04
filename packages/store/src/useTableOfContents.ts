import { useStore } from './store';

export function useTableOfContents() {
  const tableOfContents = useStore.getState().tableOfContents || [];
  return {
    tableOfContents
  };
}
