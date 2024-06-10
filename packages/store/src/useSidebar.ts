import { useStore } from './store';
import { useBreadcrumbs } from './useBreadcrumbs';
import { useRoute } from './useRoute';
import type { Breadcrumb } from './types';

export function useSidebar() {
  const menu = useStore(state => state.sidebarData) || [];
  const { route } = useRoute();
  const { breadcrumbs } = useBreadcrumbs();

  return {
    menu,
    selectedNodeId: route,
    selectedGroupIds: getIds(breadcrumbs)
  };
}
function getIds(breadcrumbs: Breadcrumb[]) {
  const pathIds = breadcrumbs.reduce<string[]>(
    (result, { id }) => [...result, id.replace(/\/[^\/]*$/, '')],
    []
  );
  return new Set(pathIds);
}
