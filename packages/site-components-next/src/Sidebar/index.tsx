import * as React from 'react';
import type { loadPage } from '@jpmorganchase/mosaic-loaders';
import { PageNavigation as UI } from '@jpmorganchase/mosaic-site-components';
import type { Breadcrumb } from '@jpmorganchase/mosaic-types';

function getIds(breadcrumbs: Breadcrumb[]) {
  return new Set(breadcrumbs.map(({ id }) => id.substr(0, id.lastIndexOf('.'))));
}

export async function Sidebar({ path, fetcher }: { path: string; fetcher: typeof loadPage }) {
  const { data } = await fetcher(path);
  const props = {
    menu: data?.sidebarData || [],
    selectedNodeId: data?.route,
    expandedNodeIds: getIds(data?.breadcrumbs || [])
  };

  return <UI {...props} />;
}
