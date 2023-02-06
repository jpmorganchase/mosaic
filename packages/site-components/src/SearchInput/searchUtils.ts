import Fuse from 'fuse.js';

const fuseOptions = {
  includeScore: true,
  includeMatches: true,
  maxPatternLength: 240,
  ignoreLocation: true,
  threshold: 0.3,
  keys: ['title', 'content']
};

const calculateBestIndex = rawIndices => {
  const sorted = rawIndices
    .sort((a, b) => {
      const aSize = Math.abs(a[0] - a[1]);
      const bSize = Math.abs(b[0] - b[1]);
      return aSize - bSize;
    })
    .reverse();
  const indices = sorted[0];
  const delta = Math.abs(indices[0] - indices[1]);
  return { indices, delta };
};

export const getBestMatch = matches => {
  const matchesWithIndex = matches
    .map(match => ({
      ...match,
      bestIndex: calculateBestIndex(match.indices)
    }))
    .sort((a, b) => a.bestIndex.delta - b.bestIndex.delta)
    .reverse();
  return matchesWithIndex[0];
};

export const highlightMatch = match => {
  const { indices } = match.bestIndex;
  const parts = [
    match.value.substring(0, indices[0]),
    match.value.substring(indices[0], indices[1] + 1),
    match.value.substring(indices[1] + 1)
  ];
  return `${parts[0]}<strong>${parts[1]}</strong>${parts[2]}`;
};

export const parseSearchResults = results =>
  results.map(result => {
    const bestMatch = getBestMatch(result.matches);
    const highlight = highlightMatch(bestMatch);
    return {
      title: result.item.title,
      content: highlight,
      route: result.item.route
    };
  });

export const performSearch = (index, term, keys) => {
  const options = { ...fuseOptions, keys };
  const fuse = new Fuse(index, options);

  const results = fuse.search(term);

  const parsedResults = parseSearchResults(results);
  return parsedResults;
};
