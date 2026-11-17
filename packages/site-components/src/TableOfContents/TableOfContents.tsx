import React, { useEffect, useState, useId } from 'react';
import { throttle } from 'lodash-es';
import { Caption1 } from '@jpmorganchase/mosaic-components';

import { TableOfContentsItem } from './TableOfContentsItem';
import { getHeadingPosition, getHeaderHeight, mostRecentScrollPoint } from './utils';
import styles from './styles.css';

export type Item = { level: number; id: string; text: string };
/** @deprecated Use Item; selection is tracked separately from heading metadata. */
export interface CurrentItem extends Item {
  current: boolean;
}

export type TableOfContentsProps = {
  items?: Item[];
};

export const TableOfContents: React.FC<TableOfContentsProps> = ({ items }) => {
  if (!items) {
    throw new Error('No `items` specified for Table of Contents.');
  }

  const [selectedHeading, setSelectedHeading] = useState<string | undefined>(items[0]?.id);

  useEffect(() => {
    const updateSelection = () => {
      // Keep measurements paired with the supplied IDs. Cached positions become
      // stale after navigation or late content changes.
      const positions = items.map(item => getHeadingPosition(item.id));
      // A short final section may never reach the header because scrolling clamps.
      const atBottom =
        window.scrollY > 0 &&
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1;
      const current = mostRecentScrollPoint(
        atBottom ? Infinity : window.scrollY + getHeaderHeight() + 1,
        positions
      );
      setSelectedHeading(current === null ? undefined : items[current].id);
    };
    const handleScroll = throttle(updateSelection, 60);
    const observer = new ResizeObserver(handleScroll);
    observer.observe(document.body);
    document.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    window.addEventListener('hashchange', handleScroll);
    updateSelection();
    return () => {
      document.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      window.removeEventListener('hashchange', handleScroll);
      observer.disconnect();
      handleScroll.cancel();
    };
  }, [items]);

  const captionId = useId();

  return items.length ? (
    <nav data-testid="table-of-contents" aria-labelledby={captionId}>
      <Caption1 id={captionId}>On this page</Caption1>
      <ul className={styles.list}>
        {items.map(item => (
          <li key={item.id}>
            <TableOfContentsItem current={selectedHeading} item={item} />
          </li>
        ))}
      </ul>
    </nav>
  ) : null;
};
