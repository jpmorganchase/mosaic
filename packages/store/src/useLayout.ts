import { useStore } from './store';
import type { LayoutSlice } from './types';

type Layout = LayoutSlice;

export function useLayout(): Layout {
  const layout = useStore(state => state.layout);
  return { layout };
}
