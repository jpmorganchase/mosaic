import { useStore } from './store';
import type { MetaSlice } from './types';

export type Meta = {
  meta: MetaSlice;
};

export function useMeta(): Meta {
  const meta = useStore(state => ({
    description: state.description,
    breadcrumbs: state.breadcrumbs,
    title: state.title
  }));
  return {
    meta
  };
}
