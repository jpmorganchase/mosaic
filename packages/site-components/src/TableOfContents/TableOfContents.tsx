import React, { useState } from 'react';
import { Caption1 } from '@jpmorganchase/mosaic-components';

import { TableOfContentsItem } from './TableOfContentsItem';
import styles from './styles.css';
import { useIntersectionObserver } from './useIntersectionObserver';

export type Item = { level: number; id: string; text: string };

export interface CurrentItem extends Item {
  current: boolean;
}

export type TableOfContentsProps = {
  items?: Item[];
};

export const TableOfContents: React.FC<TableOfContentsProps> = ({ items }) => {
  if (!items) {
    return null;
  }
  const [active, setActive] = useState<string[]>([]);
  const { handleObservedItemClick } = useIntersectionObserver(items, setActive);

  return items?.length ? (
    <nav>
      <Caption1>On this page</Caption1>
      <ul aria-label="Table of contents" className={styles.list} role="tree">
        {items.map(item => (
          <TableOfContentsItem
            selected={active.findIndex(activeItem => activeItem === item.id) > -1}
            item={item}
            key={item.id}
            onClick={event => {
              handleObservedItemClick();
              setActive([item.id]);
              event.preventDefault();
              const hash = `#${item.id}`;
              const target = document.getElementById(item.id);

              target?.scrollIntoView({
                block: 'start',
                inline: 'nearest',
                behavior: 'smooth'
              });
              if (window.history.pushState) {
                window.history.pushState(null, '', hash);
              } else {
                window.location.hash = hash;
              }
            }}
          />
        ))}
      </ul>
    </nav>
  ) : null;
};
