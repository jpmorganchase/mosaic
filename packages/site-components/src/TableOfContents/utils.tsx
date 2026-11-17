import type { CurrentItem, Item } from './TableOfContents';

/** Select the heading at/above the reading position, or the first visible heading. */
export const mostRecentScrollPoint = (
  scrollPosition: number,
  positions: readonly (number | null)[]
): number | null => {
  let current: number | null = null;
  for (let index = 0; index < positions.length; index++) {
    const position = positions[index];
    if (position === null || !Number.isFinite(position)) continue;
    if (current === null) current = index;
    if (position > scrollPosition) break;
    current = index;
  }
  return current;
};

export const getHeadingPosition = (id: string): number | null => {
  const heading = document.getElementById(id);
  return heading ? heading.getBoundingClientRect().top + window.scrollY : null;
};

export const getHeaderHeight = (): number =>
  document.querySelector('header')?.getBoundingClientRect().height ?? 0;

export const stripMarkdownLinks = (text: string): string =>
  text.replace(/\[([^[\]]*)\]\((.*?)\)/gm, '$1');
/** @deprecated Supply the page's TOC items instead of scanning unrelated headings. */
export const setupHeadingState = (): CurrentItem[] => {
  if (typeof document === 'undefined') return [];
  return Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((element, index) => ({
    id: element.id || `toc-heading-${index}`,
    level: Number(element.tagName.slice(1)),
    text: element.textContent || '',
    current: false
  }));
};

/** @deprecated Read the first supplied item's id directly. */
export const setupSelectedHeadingState = (headings: readonly Pick<Item, 'id'>[]): string =>
  headings[0]?.id ?? '';
