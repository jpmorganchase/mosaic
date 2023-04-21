import Fuse from 'fuse.js';

export type Index = [number, number];
type BestIndex = {
  index: Index;
  delta: number;
};

/**
 * A "match" as returned by Fuse.js
 */
export type Match = {
  indices: Index[];
  key: string;
  value: string;
};

/**
 * A "match" as returned by Fuse.js, with the best index calculated
 */
export type InternalMatch = Match & {
  bestIndex: BestIndex;
};

export type SearchResult = {
  title: string;
  route: string;
  content: string;
};

export const calculateBestIndex = (indices: Index[]): BestIndex => {
  const sorted = indices
    .sort((a, b) => {
      const aSize = Math.abs(a[0] - a[1]);
      const bSize = Math.abs(b[0] - b[1]);
      return aSize - bSize;
    })
    .reverse();
  const index = sorted[0];
  const delta = Math.abs(index[0] - index[1]);
  return { index, delta };
};

/**
 * Highlight a section of text with a <strong> tag
 *
 * This is required in addition to the Salt `<Hightlight>` component because
 * the Fuse.js "matches" may include text that differs slightly from the original
 * search term. For example, if the search term is "foo", the match may be "fool".
 *
 * @param text The full text
 * @param index The start and end points of the target portion of the text
 * */
export const highlightMatch = (text: string, index: Index) => {
  const parts = [
    text.substring(0, index[0]),
    text.substring(index[0], index[1] + 1),
    text.substring(index[1] + 1)
  ];
  if (parts[1].length === 0) return text;
  return `${parts[0]}<strong>${parts[1]}</strong>${parts[2]}`;
};

export const getBestMatch = (matches: Match[], fallback: string) => {
  const matchesWithIndex = matches
    .filter(match => match.key !== 'title' && match.key !== 'route')
    .map(match => ({
      ...match,
      bestIndex: calculateBestIndex(match.indices)
    }))
    .sort((a, b) => a.bestIndex.delta - b.bestIndex.delta)
    .reverse();
  if (matchesWithIndex.length > 0 && matchesWithIndex[0].value.length > 0) {
    const bestMatch = matchesWithIndex[0];
    return highlightMatch(bestMatch.value, bestMatch.bestIndex.index);
  }
  return fallback;
};

export const parseSearchResults = (results): SearchResult[] =>
  results.map(result => {
    const fallbackContent = result.item.content ? result.item.content[0] : result.title;
    const bestMatch = getBestMatch(result.matches, fallbackContent);
    return {
      title: result.item.title,
      content: bestMatch,
      route: result.item.route
    };
  });

export const performSearch = (index, term, config) => {
  const fuse = new Fuse(index, config);
  const results = fuse.search(term);

  const parsedResults = parseSearchResults(results);
  return parsedResults;
};
