import React from 'react';
import { useSidebar } from '@jpmorganchase/mosaic-store';
import { VerticalNavigation } from './VerticalNavigation';

export const PageNavigation = () => {
  const { menu, selectedNodeId, expandedNodeIds } = useSidebar();
  return (
    <VerticalNavigation
      menu={menu}
      selectedNodeId={selectedNodeId}
      expandedNodeIds={expandedNodeIds}
    />
  );
};
