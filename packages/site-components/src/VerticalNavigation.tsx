import React, { MouseEventHandler, useState } from 'react';
import { StackLayout } from '@salt-ds/core';
import { NavigationItem, NavigationItemRenderProps } from './NavigationItem';
import { Link } from '@jpmorganchase/mosaic-components';
import { SidebarItem } from '@jpmorganchase/mosaic-store';

export type VerticalNavigationProps = {
  /** Selected item groups ids to expand */
  selectedGroupIds?: Set<string>;
  /** String ID of the selected item */
  selectedNodeId?: string;
  /** Navigation item data */
  menu: SidebarItem[];
};

const renderItem: React.FC<NavigationItemRenderProps<HTMLButtonElement | HTMLAnchorElement>> = ({
  href,
  isParent,
  elementProps
}) => {
  if (isParent) {
    return <button {...elementProps} />;
  }
  return <Link variant={'component'} {...elementProps} href={href} />;
};

const renderNavigationItem = (
  item: SidebarItem,
  selectedNodeId: string | undefined,
  expandedGroupIds: Set<string>,
  selectedGroupIds: Set<string>,
  setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>,
  level: number
) => {
  const { id, kind, name } = item;
  const isGroup = kind === 'group';

  const link = !isGroup ? item?.data?.link : undefined;

  const childNodes = isGroup ? item.childNodes : undefined;
  const isExpanded = isGroup ? expandedGroupIds.has(id) : false;
  const containsSelectedNode = selectedGroupIds.has(id);
  const isActive = selectedNodeId === id || (!isExpanded && containsSelectedNode);

  const handleExpand: MouseEventHandler<HTMLAnchorElement | HTMLButtonElement> = event => {
    event.stopPropagation();
    if (!expandedGroupIds.has(id)) {
      setExpanded(new Set([...expandedGroupIds, id]));
    } else {
      const filteredArray = Array.from(expandedGroupIds).filter(
        expandedNodeId => expandedNodeId !== id
      );
      setExpanded(new Set<string>(filteredArray));
    }
  };

  return (
    <li key={id}>
      <NavigationItem
        href={link}
        active={isActive}
        orientation="vertical"
        onExpand={isGroup ? handleExpand : undefined}
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
              expandedGroupIds,
              selectedGroupIds,
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
  selectedGroupIds = new Set(),
  selectedNodeId
}) => {
  const [expandedGroupIds, setExpandedGroupIds] = useState(selectedGroupIds);
  const [prevSelectedNodeId, setPreviousSelectedNodeId] = useState(selectedNodeId);
  if (prevSelectedNodeId !== selectedNodeId) {
    const uniqueSet = new Set([...expandedGroupIds, ...selectedGroupIds]);
    setExpandedGroupIds(uniqueSet);
    setPreviousSelectedNodeId(selectedNodeId);
  }

  return (
    <nav>
      <StackLayout
        data-testid="vertical-navigation"
        as="ul"
        gap="var(--salt-size-border)"
        style={{ width: 250, listStyle: 'none', paddingLeft: 0 }}
      >
        {menu.map(item =>
          renderNavigationItem(
            item,
            selectedNodeId,
            expandedGroupIds,
            selectedGroupIds,
            setExpandedGroupIds,
            0
          )
        )}
      </StackLayout>
    </nav>
  );
};
