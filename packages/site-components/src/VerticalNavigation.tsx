import React from 'react';
import { Sidebar as SidebarPro, Menu, MenuItem, SubMenu } from 'react-pro-sidebar';
import { link } from '@jpmorganchase/mosaic-theme';
import { Icon, Link } from '@jpmorganchase/mosaic-components';
import { SidebarItem, useColorMode } from '@jpmorganchase/mosaic-store';
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

const createMenuItemStyles = colorMode => ({
  subMenuContent: {
    backgroundColor: 'inherit',
    color: 'inherit'
  },
  button: ({ active }) => {
    return {
      ':active': {
        backgroundColor: 'unset',
        color:
          colorMode === 'light'
            ? 'var(--color-light-navigable-selectableLink-selectedLabel)'
            : 'var(--color-dark-navigable-selectableLink-selectedLabel)'
      },
      ':disabled': {
        backgroundColor: 'unset',
        color:
          colorMode === 'light'
            ? 'var(--color-light-navigable-selectableLink-unselectedLabel)'
            : 'var(--color-dark-navigable-selectableLink-unselectedLabel)'
      },
      ':hover': {
        backgroundColor:
          colorMode === 'light'
            ? 'var(--color-light-neutral-background-emphasis)'
            : 'var(--color-dark-neutral-background-emphasis)',
        color:
          colorMode === 'light'
            ? 'var(--color-light-navigable-selectableLink-unselectedLabel)'
            : 'var(--color-dark-navigable-selectableLink-unselectedLabel)'
      },
      fontWeight: active ? 'var(--fontWeight-bold)' : 'var(--fontWeight-regular)'
    };
  }
});

const rootStyles = {
  borderRightWidth: '0px'
};

const SubMenuLink = ({ href, selectedNodeId, ...rest }) => {
  if (href === selectedNodeId) {
    return <div {...rest} />;
  }
  return <Link href={href} variant={'component'} {...rest} />;
};

const renderMenu = (menu, expandedNodeIds, selectedNodeId) =>
  menu.reduce((result, item) => {
    const menuItem = item?.childNodes?.length ? (
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
        className={link({ variant: 'selectable' })}
        component={<Link href={item.data.link} variant={'component'} />}
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
}) => {
  const colorMode = useColorMode();
  const menuItemStyles = createMenuItemStyles(colorMode);
  return (
    <SidebarPro backgroundColor="inherit" rootStyles={rootStyles} width="100%" {...rest}>
      <Menu renderExpandIcon={MenuIcon} menuItemStyles={menuItemStyles}>
        {renderMenu(menu, expandedNodeIds, selectedNodeId)}
      </Menu>
    </SidebarPro>
  );
};
