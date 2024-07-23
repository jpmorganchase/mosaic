import React from 'react';
import { useRouter } from 'next/router';
import { Menu, MenuItem, MenuPanel, MenuTrigger } from '@salt-ds/core';
import { Button, Icon } from '@jpmorganchase/mosaic-components';

import styles from './styles.css';
import { Breadcrumb } from './Breadcrumb';

export type BreadcrumbProps = {
  id: string;
  label: string;
  path: string;
};

export type BreadcrumbsProps = {
  breadcrumbs: BreadcrumbProps[];
  enabled: boolean;
};

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ breadcrumbs, enabled }) => {
  const router = useRouter();
  if (!enabled) {
    return null;
  }

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const path = event.currentTarget.getAttribute('data-path');
    if (path) {
      router.push(path);
    }
  };

  const maxItems = 5;
  const itemsBeforeCollapse = 1;

  let visibleItemsBefore = breadcrumbs;
  let hiddenItems: typeof breadcrumbs = [];
  let visibleItemsAfter: typeof breadcrumbs = [];

  if (breadcrumbs.length > maxItems) {
    visibleItemsBefore = breadcrumbs.slice(0, itemsBeforeCollapse);
    hiddenItems = breadcrumbs.slice(itemsBeforeCollapse, -1);
    visibleItemsAfter = breadcrumbs.slice(visibleItemsBefore.length + hiddenItems.length);
  }

  return (
    <nav className={styles.root} aria-label="Breadcrumbs">
      <ol className={styles.ol}>
        {visibleItemsBefore.map(({ id, label, path }, index) => (
          <Breadcrumb
            key={id}
            href={path}
            isCurrentLevel={index === breadcrumbs.length - 1}
            hideSeparator={index === breadcrumbs.length - 1}
          >
            {label}
          </Breadcrumb>
        ))}
        {hiddenItems.length > 0 && (
          <Menu>
            <MenuTrigger>
              <Button variant="secondary" aria-label="Open Menu">
                <Icon name="overflowMenu" aria-hidden />
              </Button>
            </MenuTrigger>
            <MenuPanel>
              {hiddenItems.map(({ id, label, path }) => (
                <MenuItem key={id} data-path={path} onClick={handleClick}>
                  {label}
                </MenuItem>
              ))}
            </MenuPanel>
          </Menu>
        )}
        {visibleItemsAfter.map(({ id, label, path }) => (
          <Breadcrumb key={id} href={path} isCurrentLevel>
            {label}
          </Breadcrumb>
        ))}
      </ol>
    </nav>
  );
};
