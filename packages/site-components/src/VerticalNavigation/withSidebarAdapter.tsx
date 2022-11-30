import React from 'react';
import { useSidebar } from '@dpmosaic/site-store';

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
