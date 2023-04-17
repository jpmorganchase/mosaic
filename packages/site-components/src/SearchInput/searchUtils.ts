import Fuse from 'fuse.js';

export type Index = [number, number];
type BestIndex = {
  index: Index;
  delta: number;
};
export type Match = {
  indices: Index[];
  key: string;
  value: string;
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

export const getBestMatch = (matches: Match[]) => {
  const matchesWithIndex = matches
    .map(match => ({
      ...match,
      bestIndex: calculateBestIndex(match.indices)
    }))
    .sort((a, b) => a.bestIndex.delta - b.bestIndex.delta)
    .reverse();
  return matchesWithIndex[0].value;
};

export const parseSearchResults = (results): SearchResult[] =>
  results.map(result => {
    const bestMatch = getBestMatch(result.matches);
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
