import React from 'react';
import { useSidebar } from '@jpmorganchase/mosaic-store';

export const withSidebarAdapter = Component => () => {
  const { sidebarData, selectedNodeId, expandedNodeIds } = useSidebar();
  return (
    <Component
      sidebarData={sidebarData}
      selectedNodeId={selectedNodeId}
      expandedNodeIds={expandedNodeIds}
    />
  );
};
