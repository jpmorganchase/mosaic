import { StoriesResponseJSON, StorybookPage, StoryConfig } from './types/index.js';

const createStorybookPages = (
  storyJSON: StoriesResponseJSON,
  prefixDir: string,
  index: number,
  storyConfig: StoryConfig[]
): StorybookPage[] => {
  const {
    additionalData = {},
    additionalTags = [],
    description,
    filter,
    filterTags,
    url: storybookUrl
  } = storyConfig[index];
  const storyIds = Object.keys(storyJSON.stories);
  return storyIds.reduce<StorybookPage[]>((result, storyId) => {
    const story = storyJSON.stories[storyId];
    if (filter && !filter.test(story.kind)) {
      return result;
    }
    if (filterTags && filterTags.some(filterTag => story.tags.indexOf(filterTag) >= 0)) {
      return result;
    }
    const { id, kind, name, tags, story: storyName } = story;
    const title = `${kind} - ${name}`;
    const route = `${prefixDir}/${id}`;
    const pageTags = [...tags.filter(tag => tag.indexOf('salt-pattern-') >= 0), ...additionalTags];
    const storyPage: StorybookPage = {
      title,
      layout: 'DetailTechnical',
      route,
      fullPath: `${route}.mdx`,
      tags: pageTags,
      data: {
        id,
        description,
        kind,
        link: `${storybookUrl}/iframe.html?id=${id}&viewMode=story&shortcuts=false&singleStory=true`,
        name,
        source: 'STORYBOOK',
        story: storyName,
        ...additionalData
      },
      content: ``
    };
    return [...result, storyPage];
  }, []);
};

export default createStorybookPages;
