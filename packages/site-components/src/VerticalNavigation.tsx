import React from 'react';
import {
  ElementStyles,
  Sidebar as SidebarPro,
  Menu,
  MenuItem,
  SubMenu,
  ProSidebarProvider
} from 'react-pro-sidebar';
import { link, vars } from '@jpmorganchase/mosaic-theme';
import { Icon, Link } from '@jpmorganchase/mosaic-components';
import { useColorMode } from '@jpmorganchase/mosaic-store';
import type { SidebarItem } from '@jpmorganchase/mosaic-types';

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
    backgroundColor: 'inherit'
  },
  button: ({ active }) => {
    const buttonStyle: ElementStyles = {
      paddingRight: vars.space.horizontal.x4
    };

    return {
      ...buttonStyle,
      ':disabled': {
        backgroundColor: 'unset',
        color: `var(--mosaic-color-${colorMode}-navigable-selectableLink-unselectedLabel)`
      },
      ':hover': {
        backgroundColor: `var(--mosaic-color-${colorMode}-neutral-background-emphasis)`
      },
      fontWeight: active ? vars.fontWeight.semibold : vars.fontWeight.regular,
      borderLeft: active
        ? `4px solid var(--mosaic-color-${colorMode}-navigable-selectableLink-selected)`
        : '4px solid transparent',
      color: active
        ? `var(--mosaic-color-${colorMode}-navigable-selectableLink-selectedLabel)`
        : `var(--mosaic-color-${colorMode}-navigable-selectableLink-unselectedLabel)`
    };
  },
  label: {
    marginRight: vars.space.horizontal.x4
  }
});

const rootStyles = {
  width: '100%',
  borderRightWidth: '0px'
};

const SubMenuLink = ({ href, selectedNodeId, ...rest }) => {
  if (href === selectedNodeId) {
    return <div {...rest} />;
  }
  return <Link href={href} variant="component" {...rest} />;
};

const renderMenu = (menu, expandedNodeIds, selectedNodeId) =>
  menu.reduce((result, item) => {
    const menuItem =
      item?.childNodes?.length > 0 ? (
        <SubMenu
          active={selectedNodeId === item.id && selectedNodeId !== undefined}
          component={<SubMenuLink href={item.data?.link} selectedNodeId={selectedNodeId} />}
          defaultOpen={expandedNodeIds?.has(item.id)}
          key={item.id}
          label={item.name}
        >
          {renderMenu(item.childNodes, expandedNodeIds, selectedNodeId)}
        </SubMenu>
      ) : (
        <MenuItem
          active={selectedNodeId === item.id}
          className={link({ variant: 'selectable' })}
          component={<Link href={item.data?.link} variant="component" />}
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
  const { colorMode } = useColorMode();
  const menuItemStyles = createMenuItemStyles(colorMode);

  return (
    <ProSidebarProvider>
      <SidebarPro backgroundColor="inherit" rootStyles={rootStyles} width="100%" {...rest}>
        <Menu renderExpandIcon={MenuIcon} menuItemStyles={menuItemStyles}>
          {renderMenu(menu, expandedNodeIds, selectedNodeId)}
        </Menu>
      </SidebarPro>
    </ProSidebarProvider>
  );
};
