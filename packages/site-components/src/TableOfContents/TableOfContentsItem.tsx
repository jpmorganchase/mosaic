import { NavigationItem } from '@salt-ds/core';
import type { MouseEvent } from 'react';

import { getHeadingPosition, getHeaderHeight, stripMarkdownLinks } from './utils';
import type { Item } from './TableOfContents';

export function TableOfContentsItem({ item, current }: { item: Item; current?: string }) {
  const selected = item.id === current;

  const hash = `#${encodeURIComponent(item.id)}`;
  const handleItemClick = (event: MouseEvent<HTMLElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const position = getHeadingPosition(item.id);
    if (position === null) return;
    event.preventDefault();
    const target = document.getElementById(item.id)!;
    // Match native fragment navigation's keyboard destination without adding
    // headings to the regular tab order or replacing an authored tabindex.
    if (!target.hasAttribute('tabindex') && target.tabIndex < 0) {
      target.setAttribute('tabindex', '-1');
      target.addEventListener(
        'blur',
        () => {
          if (target.getAttribute('tabindex') === '-1') target.removeAttribute('tabindex');
        },
        { once: true }
      );
    }
    target.focus({ preventScroll: true });
    window.scrollTo({
      top: Math.max(0, position - getHeaderHeight()),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
    });
    if (window.location.hash !== hash) {
      window.history.pushState(null, '', hash);
    }
  };

  return (
    <NavigationItem
      orientation="vertical"
      active={selected}
      href={hash}
      onClick={handleItemClick}
      level={item.level}
    >
      {stripMarkdownLinks(item.text)}
    </NavigationItem>
  );
}
