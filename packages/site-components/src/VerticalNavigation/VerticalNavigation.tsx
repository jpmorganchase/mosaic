import React from 'react';
import { useRouter } from 'next/router';
import { Sidebar, Menu, MenuItem, SubMenu } from 'react-pro-sidebar';
import { Icon } from '@jpmorganchase/mosaic-components';
import type { CSSObject } from 'styled-components';

import styles from './styles.css';

export type SidebarItem = {
  /** The id of the item */
  id: string;
  /** The name of the item */
  name: string;
  /** Sidebar data */
  data: {
    /** The link of the item */
    link: string;
  };
  /** Child nodes */
  childNodes: SidebarItem[];
  /** Whether the item is hidden */
  hidden: boolean;
};

export type SidebarProps = {
  /** Set<String> of IDs to display as expanded */
  expandedNodeIds: Set<string>;
  /** String ID of the selected item */
  selectedNodeId: string;
  /** Navigation item data */
  sidebarData: SidebarItem[];
};

export const VerticalNavigation: React.FC<SidebarProps> = ({
  sidebarData,
  selectedNodeId,
  expandedNodeIds
}) => {
  const router = useRouter();

  const renderMenu = menu =>
    menu.map(item =>
      item.childNodes ? (
        <SubMenu
          active={selectedNodeId === item.id}
          defaultOpen={expandedNodeIds.has(item.id)}
          onClick={e => {
            e.stopPropagation();
            router.push(item.data.link);
          }}
          label={item.name}
          key={item.id}
        >
          {renderMenu(item.childNodes)}
        </SubMenu>
      ) : (
        <MenuItem
          active={selectedNodeId === item.id}
          onClick={e => {
            e.stopPropagation();
            router.push(item.data.link);
          }}
          key={item.id}
        >
          {item.name}
        </MenuItem>
      )
    );

  return (
    <Sidebar backgroundColor="inherit">
      <Menu
        renderExpandIcon={({ open }) =>
          open ? <Icon name="chevronDown" /> : <Icon name="chevronRight" />
        }
        renderMenuItemStyles={({ active }) =>
          ({
            /** override the sidebar library styling */
            '.menu-anchor': active ? styles.activeMenuAnchor : styles.menuAnchor,
            '.menu-anchor:hover': styles.hoverMenuAnchor,
            '.sub-menu-content': styles.subMenu,
            '.menu-label': styles.menuLabel
          } as CSSObject)
        }
      >
        {renderMenu(sidebarData)}
      </Menu>
    </Sidebar>
  );
};
