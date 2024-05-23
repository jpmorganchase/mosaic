import React, { MouseEventHandler, useState } from 'react';
import { StackLayout } from '@salt-ds/core';
import { NavigationItem, NavigationItemRenderProps } from './NavigationItem';
import { Link } from '@jpmorganchase/mosaic-components';
import { SidebarItem } from '@jpmorganchase/mosaic-store';

export type VerticalNavigationProps = {
  /** Set<String> of IDs to display as expanded */
  expandedNodeIds?: Set<string>;
  /** String ID of the selected item */
  selectedNodeId?: string;
  /** Navigation item data */
  menu: SidebarItem[];
};

const renderItem: React.FC<NavigationItemRenderProps<HTMLButtonElement | HTMLAnchorElement>> = ({
  href,
  elementProps
}) => {
  return <Link variant={'component'} {...elementProps} href={href} />;
};

const renderNavigationItem = (
  item: SidebarItem,
  selectedNodeId: string | undefined,
  expandedNodeIds: string[],
  setExpanded: React.Dispatch<React.SetStateAction<string[]>>,
  level: number
) => {
  const {
    id,
    name,
    childNodes,
    data: { link }
  } = item;
  const isActive =
    !!selectedNodeId &&
    (selectedNodeId === id ||
      (!expandedNodeIds.includes(id) &&
        childNodes?.some(childNode => childNode.id === selectedNodeId)));
  const isExpanded = expandedNodeIds.includes(id);

  const handleExpand: MouseEventHandler<HTMLAnchorElement | HTMLButtonElement> = event => {
    event.stopPropagation();
    if (!expandedNodeIds.includes(id)) {
      setExpanded([...expandedNodeIds, id]);
    } else {
      setExpanded(expandedNodeIds.filter(expandedNodeId => expandedNodeId !== id));
    }
  };
  return (
    <li key={id}>
      <NavigationItem
        href={link}
        active={isActive}
        orientation="vertical"
        onExpand={handleExpand}
        parent={!!childNodes?.length}
        render={renderItem}
        expanded={isExpanded}
        level={level}
      >
        {name}
      </NavigationItem>
      {isExpanded ? (
        <StackLayout
          as="ul"
          gap="var(--salt-size-border)"
          style={{
            width: 250,
            listStyle: 'none',
            paddingLeft: 0
          }}
        >
          {childNodes?.map(childItem => {
            return renderNavigationItem(
              childItem,
              selectedNodeId,
              expandedNodeIds,
              setExpanded,
              level + 1
            );
          })}
        </StackLayout>
      ) : null}
    </li>
  );
};

export const VerticalNavigation: React.FC<VerticalNavigationProps> = ({
  menu,
  expandedNodeIds: currentRouteNodeIds = [],
  selectedNodeId
}) => {
  const [expandedNodeIds, setExpanded] = useState<string[]>([...currentRouteNodeIds]);

  return (
    <nav>
      <StackLayout
        as="ul"
        gap="var(--salt-size-border)"
        style={{ width: 250, listStyle: 'none', paddingLeft: 0 }}
      >
        {menu.map(item =>
          renderNavigationItem(item, selectedNodeId, expandedNodeIds, setExpanded, 0)
        )}
      </StackLayout>
    </nav>
  );
};
