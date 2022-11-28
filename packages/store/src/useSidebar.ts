import { useStore } from './store';
import { useRoute, useBreadcrumbs } from '.';

export function useSidebar() {
  const sidebarData = useStore(state => state.sidebarData) || [];
  const { route } = useRoute();
  const { breadcrumbs } = useBreadcrumbs();
  return {
    sidebarData,
    selectedNodeId: route,
    expandedNodeIds: getIds(breadcrumbs)
  };
}
function getIds(breadcrumbs) {
  return new Set(breadcrumbs.map(({ id }) => id.substr(0, id.lastIndexOf('.'))));
}
