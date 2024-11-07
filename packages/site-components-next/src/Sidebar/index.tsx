import type { loadPage } from '@jpmorganchase/mosaic-loaders';
import { PageNavigation as UI } from '@jpmorganchase/mosaic-site-components';
import type { Breadcrumb } from '@jpmorganchase/mosaic-store';

function getIds(breadcrumbs: Breadcrumb[]) {
  return new Set(breadcrumbs.map(({ id }) => id.substr(0, id.lastIndexOf('.'))));
}

export async function Sidebar({ path, loader }: { path: string; loader: typeof loadPage }) {
  const { data } = await loader(path);
  const props = {
    menu: data?.sidebarData || [],
    selectedNodeId: data?.route,
    expandedNodeIds: getIds(data?.breadcrumbs || [])
  };

  return <UI {...props} />;
}
