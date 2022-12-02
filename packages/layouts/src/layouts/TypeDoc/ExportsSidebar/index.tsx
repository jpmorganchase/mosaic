import React from 'react';
import { Caption1, Caption2, Link } from '@jpmorganchase/mosaic-components';

import styles from './styles.css';

export type Item = { level: number; id: string; text: string };

function TableOfContentsItem({ item }) {
  return (
    <li aria-label={item.text} aria-level={1} className={styles.item} tabIndex={-1}>
      <Link className={item.parentProps.className} href={item.href} variant="component">
        <Caption2 className={item.className}>{item.text}</Caption2>
      </Link>
    </li>
  );
}

export function ExportsSidebar({ items }) {
  if (!items) {
    throw new Error('No `items` specified for Exports Sidebar TOC.');
  }
  if (!items.length) {
    return null;
  }

  return (
    <nav>
      <Caption1>Exports</Caption1>
      <ul aria-label="Exports" className={styles.list} role="tree">
        {items.map((item, i) => (
          <TableOfContentsItem item={item} key={`exports_${i}`} />
        ))}
      </ul>
    </nav>
  );
}
