import type { Page } from '@jpmorganchase/mosaic-types';

/* Storybook Source config - added to mosaic.config.mjs */
export type StoryConfig = {
  storiesUrl?: string;
  storyUrlPrefix: string;
  description: string;
  filter?: RegExp;
  filterTags?: string[];
  meta?: Partial<StorybookPage>;
};

/* Storybook types inlined and simplified from @storybook/core/types */
interface Parameters {
  [name: string]: any;
}

interface BaseIndexEntry {
  id: string;
  name: string;
  title: string;
  tags?: string[];
  importPath: string;
}
type StoryIndexEntry = BaseIndexEntry & {
  type: 'story';
};
type DocsIndexEntry = BaseIndexEntry & {
  storiesImports: string[];
  type: 'docs';
};
export type IndexEntry = StoryIndexEntry | DocsIndexEntry;

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface API_PreparedStoryIndex {
  v: number;
  entries: Record<string, IndexEntry>;
}

interface V3CompatIndexEntry extends Omit<StoryIndexEntry, 'type' | 'tags'> {
  kind: string;
  story: string;
  parameters: Parameters;
}
export interface StoryIndexV2 {
  v: number;
  stories: Record<
    string,
    Omit<V3CompatIndexEntry, 'title' | 'name' | 'importPath'> & {
      name?: string;
    }
  >;
}
export interface StoryIndexV3 {
  v: number;
  stories: Record<string, V3CompatIndexEntry>;
}

export type StoriesResponseJSON = StoryIndexV2 | StoryIndexV3 | API_PreparedStoryIndex;

/** Storybook page data */
export type StorybookPageData = {
  type: 'story' | 'docs';
  id: string;
  description: string;
  contentUrl: string;
  link: string;
  title: string;
  name: string;
};

/** Page created by the Source for each Storybook story */
export type StorybookPage = {
  description?: string;
  data: StorybookPageData;
  tags?: string[];
} & Page;
