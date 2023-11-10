import type { Page } from '@jpmorganchase/mosaic-types';

export type StoryConfig = {
  url: string;
  owner: string;
  filter: RegExp;
  additionalTags?: string[];
};

export type StoryJSON = {
  id: string;
  kind: string;
  name: string;
  story: string;
  title: string;
  tags: string[];
};

export type StoriesJSON = {
  stories: Record<string, StoryJSON>;
};

export type StorybookPageData = {
  id: string;
  link: string;
  kind: string;
  name: string;
  owner: string;
  story: string;
  source: 'STORYBOOK';
};

export type StorybookPage = {
  content: string;
  description?: string;
  layout: string;
  data: StorybookPageData;
  tags?: string[];
} & Page;
