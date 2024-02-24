import type { Page } from '@jpmorganchase/mosaic-types';

/** Get Projects Observable */
export type ProjectsTransformerOptions = {
  projectIds: string[];
};
export type ProjectsTransformerResult = {
  fileUrl: string;
  meta?: Record<string, unknown>;
};
export type ProjectFile = {
  key: string;
  thumbnail_url: string;
  last_modified: string;
  branches?: ProjectFile[];
};
export type ProjectsResponse = {
  name: string;
  files: ProjectFile[];
};

/** Get Project Files Observable */
export type ProjectFilesResponse = {
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

/** Generate Thumbnail Observable */
export type GenerateThumbnailResponse = {
  err: null | number;
  images: Record<string, string>;
};
export type GenerateThumbnailTransformerOptions = { fileIds: string[]; pages: FigmaPage[] };

/** Figma page Metadata */
export type FigmaPageData = {
  name: string;
  patternId: string;
  projectId: string;
  fileId: string;
  description: string;
  embedLink: string;
  nodeId: string;
  link: string;
  thumbnailUrl?: string;
};

/** Figma page */
export type FigmaPage = {
  description?: string;
  data: FigmaPageData;
  tags: string[];
} & Page;
