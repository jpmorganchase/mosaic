import deepmerge from 'deepmerge';

import { FigmaPage } from './types/index.js';

const createFigmaPage = (pageData: Partial<FigmaPage>, prefixDir: string) => {
  const { data: { name, description, patternId, tags } = {} } = pageData;
  const route = `${prefixDir}/${patternId}`.replace(/\./g, '_').toLowerCase();
  const pageTags = tags ? tags.split(',') : [];
  const figmaPage = {
    title: name,
    data: { source: 'FIGMA' },
    description,
    route,
    fullPath: `${route}.json`,
    tags: pageTags,
    content: ``
  };
  return deepmerge<typeof figmaPage, FigmaPage>(figmaPage, pageData);
};

export default createFigmaPage;
