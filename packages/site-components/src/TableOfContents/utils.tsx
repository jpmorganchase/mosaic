import type { CurrentItem, Item } from './TableOfContents';

export const mostRecentScrollPoint = (scrollPosition, allPositions) => {
  const validPositions = allPositions.filter(i => typeof i === 'number');

  // If there are no valid target positions, don't return a target.
  if (validPositions.length <= 0) return null;

  // Nearest will be the *highest* position that has not been scrolled past.
  const nearest = validPositions.reduceRight((acc, position, i) => {
    if (typeof position !== 'number') {
      return acc;
    }
    const scrolledPast = scrollPosition >= position;
    return scrolledPast ? acc : i;
  }, validPositions.length - 1);
  return nearest;
};

export const stripMarkdownLinks = text => text.replace(/\[([^[\]]*)\]\((.*?)\)/gm, '$1');

export const setupHeadingState: (items?: Item[]) => CurrentItem[] = (items = []) =>
  items.map(item => ({ ...item, current: false }));

export const setupSelectedHeadingState = headings => (headings.length > 0 ? headings[0].slug : '');
