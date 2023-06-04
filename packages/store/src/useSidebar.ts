import { useStore } from './store';
import { useBreadcrumbs } from './useBreadcrumbs';
import { useRoute } from './useRoute';
import type { Breadcrumb } from './types';

export function useSidebar() {
  const menu = useStore.getState().sidebarData || [];
  const { route } = useRoute();
  const { breadcrumbs } = useBreadcrumbs();
  return {
    menu,
    selectedNodeId: route,
    expandedNodeIds: getIds(breadcrumbs)
  };
}
function getIds(breadcrumbs: Breadcrumb[]) {
  return new Set(breadcrumbs.map(({ id }) => id.substr(0, id.lastIndexOf('.'))));
}
