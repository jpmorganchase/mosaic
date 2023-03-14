import React from 'react';
import classnames from 'clsx';
import { Caption2, Caption3 } from '@jpmorganchase/mosaic-components';

import styles from './styles.css';
import { stripMarkdownLinks } from './utils';

export function TableOfContentsItem({ item, current }) {
  const selected = item.id === current;

  const handleItemClick = e => {
    e.preventDefault();
    const target = document.getElementById(item.id);
    const { offsetHeight: headerHeight = 0 } = document.querySelector('header') || {};
    const hash = `#${item.id}`;
    const { offsetTop = 0 } = target || {};
    window.scrollTo({
      top: offsetTop - headerHeight,
      behavior: 'smooth'
    });
    if (window.history.pushState) {
      window.history.pushState(null, '', hash);
    } else {
      window.location.hash = hash;
    }
  };

  const ItemTextComponent = selected ? Caption2 : Caption3;
  return (
    <li
      aria-checked={selected}
      aria-label={item.text}
      aria-level={1}
      className={classnames(styles.item)}
      data-selected={!!selected}
      onClick={handleItemClick}
      tabIndex={-1}
    >
      <ItemTextComponent>{stripMarkdownLinks(item.text)}</ItemTextComponent>
    </li>
  );
}
