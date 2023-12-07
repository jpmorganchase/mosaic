import type { Page } from '@jpmorganchase/mosaic-types';

/** Get project response */
export type ProjectResponseJson = {
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

export type ProjectFile = {
  key: string;
  thumbnail_url: string;
  last_modified: string;
  branches?: ProjectFile[];
};

/** Get project files response */
export type ProjectFilesResponseJson = {
  name: string;
  files: ProjectFile[];
};

export type FileUrlAndMeta = {
  fileUrl: string;
  meta?: Record<string, unknown>;
};

/** Figma page Metadata */
export type FigmaPageData = {
  name: string;
  patternId: string;
  description: string;
  embedLink: string;
  link: string;
  source: 'FIGMA';
  tags?: string;
};

/** Figma page */
export type FigmaPage = {
  content: string;
  description?: string;
  data: FigmaPageData;
  tags: string[];
} & Page;
