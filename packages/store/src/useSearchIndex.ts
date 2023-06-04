import { useStore } from './store';

export type { SearchIndexSlice } from './types';

export function useSearchIndex() {
  const searchIndex = useStore.getState().searchIndex;
  const searchConfig = useStore.getState().searchConfig;

  const searchEnabled =
    searchConfig !== undefined && searchIndex !== undefined && searchIndex.length > 0;

  return {
    searchEnabled,
    searchIndex: searchEnabled ? searchIndex : [],
    searchConfig: searchEnabled ? searchConfig : {}
  };
}
