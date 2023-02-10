import { useStore } from './store';

export type { SearchIndexSlice } from './types';

export function useSearchIndex() {
  const searchIndex = useStore(state => state.searchIndex);

  const searchEnabled = searchIndex !== undefined && searchIndex.length > 0;

  return {
    searchEnabled,
    searchIndex: searchEnabled ? searchIndex : []
  };
}
