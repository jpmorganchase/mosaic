import { useStore } from './store';
import type { MetaSlice } from './types';

export type Meta = {
  meta: MetaSlice;
};

export function useMeta(): Meta {
  const meta = useStore(state => {
    const namespaceMatches = state?.route?.match(/^\/([^\/]+)/);
    const namespace = namespaceMatches?.length ? namespaceMatches[1] : '';
    return {
      description: state.description,
      breadcrumbs: state.breadcrumbs,
      title: namespace ? `${namespace} | ${state.title}` : state.title,
      lastModified: state.lastModified
    };
  });
  return {
    meta
  };
}
