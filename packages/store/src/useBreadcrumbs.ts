import { useStore } from './store';

export type { Breadcrumb } from './types';

export function useBreadcrumbs(minCrumbs = 1) {
  const breadcrumbs = useStore.getState().breadcrumbs;
  return {
    breadcrumbs: breadcrumbs || [],
    enabled: breadcrumbs?.length > minCrumbs
  };
}
