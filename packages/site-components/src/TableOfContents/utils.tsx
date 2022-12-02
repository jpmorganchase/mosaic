import type { CurrentItem, Item } from './TableOfContents';

export const mostRecentScrollPoint = (scrollPosition, allPositions) => {
  const validPositions = allPositions.filter(i => typeof i === 'number');

  // If there are no valid target positions, don't return a target.
  if (validPositions.length <= 0) return null;

  // Nearest will always be the *highest* postion that has been scrolled past.
  const nearest = validPositions.reduce((acc, position, i) => {
    if (typeof position !== 'number') {
      return acc;
    }
    const scrolledPast = scrollPosition >= position;
    return scrolledPast ? i : acc;
  }, 0);
  return nearest;
};

export const stripMarkdownLinks = text => text.replace(/\[([^[\]]*)\]\((.*?)\)/gm, '$1');

export const setupHeadingState: (items?: Item[]) => CurrentItem[] = (items = []) =>
  items.map(item => ({ ...item, current: false }));

export const setupSelectedHeadingState = headings => (headings.length > 0 ? headings[0].slug : '');
