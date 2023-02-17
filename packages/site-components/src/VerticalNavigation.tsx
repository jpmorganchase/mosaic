import React from 'react';
import { Sidebar as SidebarPro, Menu, MenuItem, SubMenu } from 'react-pro-sidebar';
import { Icon, Link } from '@jpmorganchase/mosaic-components';
import { SidebarItem } from '@jpmorganchase/mosaic-store';
export { ProSidebarProvider as SidebarProvider } from 'react-pro-sidebar';
export { useProSidebar as useSidebar } from 'react-pro-sidebar';

export type VerticalNavigationProps = {
  /** Set<String> of IDs to display as expanded */
  expandedNodeIds?: Set<string>;
  /** String ID of the selected item */
  selectedNodeId?: string;
  /** Navigation item data */
  menu: SidebarItem[];
};

const MenuIcon = ({ open }) => <Icon name={open ? 'chevronDown' : 'chevronRight'} />;

const menuItemStyles = {
  root: {
    fontSize: '13px'
  },
  subMenuContent: {
    backgroundColor: 'inherit'
  },
  button: ({ active }) => ({
    fontWeight: active ? 'var(--fontWeight-bold)' : 'var(--fontWeight-regular)',
    '&:hover': {
      opacity: 0.5,
      backgroundColor: 'inherit'
    }
  })
};

const SubMenuLink = ({ href, selectedNodeId, ...rest }) => {
  if (href === selectedNodeId) {
    return <div {...rest} />;
  }
  return <Link href={href} variant={'selectable'} {...rest} />;
};

const renderMenu = (menu, expandedNodeIds, selectedNodeId) =>
  menu.reduce((result, item) => {
    const menuItem = item.childNodes?.length ? (
      <SubMenu
        active={selectedNodeId === item.id}
        component={<SubMenuLink href={item.data.link} selectedNodeId={selectedNodeId} />}
        defaultOpen
        key={item.id}
        label={item.name}
      >
        {renderMenu(item.childNodes, expandedNodeIds, selectedNodeId)}
      </SubMenu>
    ) : (
      <MenuItem
        active={selectedNodeId === item.id}
        component={<Link href={item.data.link} variant={'selectable'} />}
        key={item.id}
      >
        {item.name}
      </MenuItem>
    );
    return [...result, menuItem];
  }, []);

export const VerticalNavigation: React.FC<VerticalNavigationProps> = ({
  menu,
  expandedNodeIds,
  selectedNodeId,
  ...rest
}) => (
  <SidebarPro style={{ height: '100%' }} backgroundColor="inherit" width="auto" {...rest}>
    <Menu renderExpandIcon={MenuIcon} menuItemStyles={menuItemStyles}>
      {renderMenu(menu, expandedNodeIds, selectedNodeId)}
    </Menu>
  </SidebarPro>
);
