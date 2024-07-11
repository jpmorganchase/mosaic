// Transformers taken from https://github.com/storybookjs/storybook/blob/34ea7ba592ff06f6fbd31e3af95aa2efdfab2397/code/core/src/manager-api/lib/stories.ts#L52
import { countBy } from 'lodash-es';
import type {
  StoriesResponseJSON,
  StoryIndexV2,
  StoryIndexV3,
  API_PreparedStoryIndex,
  IndexEntry
} from './types/index.js';

export const transformStoryIndexV2toV3 = (index: StoryIndexV2): StoryIndexV3 => ({
  v: 3,
  stories: Object.values(index.stories).reduce((acc, entry) => {
    acc[entry.id] = {
      ...entry,
      title: entry.kind,
      name: entry.name || entry.story,
      importPath: entry.parameters.fileName || ''
    };

    return acc;
  }, {} as StoryIndexV3['stories'])
});

export const transformStoryIndexV3toV4 = (index: StoryIndexV3): API_PreparedStoryIndex => {
  const countByTitle = countBy(Object.values(index.stories), 'title');
  return {
    v: 4,
    entries: Object.values(index.stories).reduce((acc, entry: any) => {
      let type: IndexEntry['type'] = 'story';
      if (
        entry.parameters?.docsOnly ||
        (entry.name === 'Page' && countByTitle[entry.title] === 1)
      ) {
        type = 'docs';
      }
      acc[entry.id] = {
        type,
        ...(type === 'docs' && { tags: ['stories-mdx'], storiesImports: [] }),
        ...entry
      };

      // @ts-expect-error (we're removing something that should not be there)
      delete acc[entry.id].story;
      // @ts-expect-error (we're removing something that should not be there)
      delete acc[entry.id].kind;

      return acc;
    }, {} as API_PreparedStoryIndex['entries'])
  };
};

/**
 * Storybook 8.0 and below did not automatically tag stories with 'dev'.
 * Therefore Storybook 8.1 and above would not show composed 8.0 stories by default.
 * This function adds the 'dev' tag to all stories in the index to workaround this issue.
 */
export const transformStoryIndexV4toV5 = (
  index: API_PreparedStoryIndex
): API_PreparedStoryIndex => ({
  v: 5,
  entries: Object.values(index.entries).reduce((acc, entry) => {
    acc[entry.id] = {
      ...entry,
      tags: entry.tags ? ['dev', 'test', ...entry.tags] : ['dev']
    };

    return acc;
  }, {} as API_PreparedStoryIndex['entries'])
});

export const normalizeStorybookJson = (input: StoriesResponseJSON): API_PreparedStoryIndex => {
  if (!input.v) {
    return {} as API_PreparedStoryIndex;
  }

  let index = input;
  index = index.v === 2 ? transformStoryIndexV2toV3(index as never) : index;
  index = index.v === 3 ? transformStoryIndexV3toV4(index as never) : index;
  index = index.v === 4 ? transformStoryIndexV4toV5(index as never) : index;
  return index as API_PreparedStoryIndex;
};
