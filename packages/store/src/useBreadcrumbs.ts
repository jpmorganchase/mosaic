import { useStore } from './store';

export type { Breadcrumb } from './types';

export function useBreadcrumbs(minCrumbs = 1) {
  const breadcrumbs = useStore(state => state.breadcrumbs);
  return {
    breadcrumbs: breadcrumbs || [],
    enabled: breadcrumbs?.length > minCrumbs
  };
}
