import { useStore } from './store';
import type { MetaSlice } from './types';

export type Meta = {
  meta: MetaSlice;
};

export function useMeta(): Meta {
  const state = useStore.getState();
  return {
    meta: {
      description: state.description,
      breadcrumbs: state.breadcrumbs,
      title: state.title
    }
  };
}
