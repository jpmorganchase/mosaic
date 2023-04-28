import type { CurrentItem } from './TableOfContents';

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

export const setupHeadingState = (): CurrentItem[] => {
  if (typeof window !== 'undefined') {
    const headingElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    return headingElements.map((element, index) => ({
      id: element.id || `toc-heading-${index}`,
      level: Number(element.tagName.slice(1)),
      text: element.textContent || '',
      current: false
    }));
  }

  return [];
};

export const setupSelectedHeadingState = headings => (headings.length > 0 ? headings[0].slug : '');
