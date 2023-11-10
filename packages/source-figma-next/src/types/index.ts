import type { Page } from '@jpmorganchase/mosaic-types';

export type ProjectFile = {
  key: string;
  thumbnail_url: string;
  last_modified: string;
  branches?: ProjectFile[];
};

export type ProjectFiles = {
  name: string;
  files: ProjectFile[];
};

export type Project = {
  document: {
    id: string;
    name: string;
    sharedPluginData: Record<string, any>;
  };
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
};

export type FigmaPageData = {
  name: string;
  patternId: string;
  description: string;
  embedLink: string;
  link: string;
  source: 'FIGMA';
  tags: string;
};

export type FigmaPage = {
  content: string;
  description?: string;
  layout: string;
  data: FigmaPageData;
  tags?: string[];
} & Page;
