import { VerticalNavigation } from './VerticalNavigation';
import { SidebarItem } from "@jpmorganchase/mosaic-types";


export type PageNavigationProps = {
  menu: SidebarItem[];
  selectedNodeId?: string;
  selectedGroupIds?: Set<string>;
};

export const PageNavigation = ({ menu, selectedNodeId, selectedGroupIds }: PageNavigationProps) => (
  <VerticalNavigation
    menu={menu}
    selectedNodeId={selectedNodeId}
    selectedGroupIds={selectedGroupIds}
  />
);
