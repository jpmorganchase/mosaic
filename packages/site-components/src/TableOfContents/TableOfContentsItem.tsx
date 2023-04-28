import React from 'react';
import classnames from 'clsx';
import { Caption2, Caption3 } from '@jpmorganchase/mosaic-components';

import styles from './styles.css';
import { stripMarkdownLinks } from './utils';

export function TableOfContentsItem({ item, selected, onClick }) {
  const ItemTextComponent = selected ? Caption2 : Caption3;
  return (
    <li
      aria-checked={selected}
      aria-label={item.text}
      aria-level={1}
      className={classnames(styles.item, styles[`level${item.level}`])}
      data-selected={!!selected}
      onClick={onClick}
      tabIndex={-1}
    >
      <ItemTextComponent>{stripMarkdownLinks(item.text)}</ItemTextComponent>
    </li>
  );
}
