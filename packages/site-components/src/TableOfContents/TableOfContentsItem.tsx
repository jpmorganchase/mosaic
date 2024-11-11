import { NavigationItem } from '@salt-ds/core';

import { stripMarkdownLinks } from './utils';
import type { TOCItem } from './TableOfContents';

export function TableOfContentsItem({ item, current }: { item: TOCItem; current?: string }) {
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

  return (
    <NavigationItem
      orientation="vertical"
      active={selected}
      href={`#${item.id}`}
      onClick={handleItemClick}
      level={item.level}
    >
      {stripMarkdownLinks(item.text)}
    </NavigationItem>
  );
}
