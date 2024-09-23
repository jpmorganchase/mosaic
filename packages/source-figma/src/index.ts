import { switchMap } from 'rxjs';
import { z } from 'zod';
import deepmerge from 'deepmerge';
import type { Source } from '@jpmorganchase/mosaic-types';
import { validateMosaicSchema } from '@jpmorganchase/mosaic-schemas';
import {
  createHttpSource,
  httpSourceCreatorSchema,
  HttpSourceResponseTransformerType
} from '@jpmorganchase/mosaic-source-http';

import type {
  FigmaPage,
  GenerateThumbnailResponse,
  GenerateThumbnailTransformerOptions,
  ProjectFilesResponse,
  ProjectsResponse,
  ProjectsTransformerOptions,
  ProjectsTransformerResult
} from './types/index.js';

const baseSchema = httpSourceCreatorSchema.omit({
  endpoints: true, // will be generated from the url in the stories object,
  transformerOptions: true // stories is the prop we need for this so no point duplicating it in source config
});

export const schema = baseSchema.merge(
  z.object({
    prefixDir: z.string(),
    figmaToken: z.string(),
    projects: z.array(
      z.object({
        id: z.number(),
        patternPrefix: z.string(),
        meta: z.object({}).passthrough()
      })
    ),
    endpoints: z.object({
      getFile: z.string().url(),
      getProject: z.string().url(),
      generateThumbnail: z.string().url()
    }),
    requestTimeout: z.number().default(5000)
  })
);

export type FigmaSourceOptions = z.infer<typeof schema>;

const createFigmaPage = (pageData: Partial<FigmaPage>, prefixDir: string) => {
  const { data: { name, description, patternId } = {} } = pageData;
  const route = `${prefixDir}/${patternId}`.replace(/\./g, '_').toLowerCase();
  const figmaPage: Partial<FigmaPage> = {
    title: name,
    description,
    route,
    fullPath: `${route}.json`,
    content: ``
  };
  return { ...figmaPage, ...pageData } as FigmaPage;
};

const FigmaSource: Source<FigmaSourceOptions, FigmaPage> = {
  create(options, sourceConfig) {
    const parsedOptions = validateMosaicSchema(schema, options);

    const { endpoints, projects, figmaToken, prefixDir, ...rest } = parsedOptions;

    const projectEndpoints: Record<string, string> = {};
    const projectById: Record<string, typeof projects[number]> = {};

    projects.forEach(project => {
      const projectId = project.id.toString();

      projectEndpoints[projectId] = endpoints.getProject.replace(':project_id', projectId);
      projectById[projectId] = project;
    });

    const projectsTransformer: HttpSourceResponseTransformerType<
      ProjectsResponse,
      ProjectsTransformerResult
    > = (
      response: ProjectsResponse,
      _prefixDir,
      index,
      transformerOptions: ProjectsTransformerOptions
    ) => {
      return [response].reduce<ProjectsTransformerResult[]>((allProjectFileUrls, { files }) => {
        const projectFileUrls = files.reduce<ProjectsTransformerResult[]>((project, { key }) => {
          const meta: Record<string, any> = {
            ...projects[index].meta
          };
          meta.data = {
            ...meta.data,
            fileId: key,
            projectId: transformerOptions.projectIds[index]
          };
          const fileUrlAndMetadata = {
            fileUrl: endpoints.getFile.replace(':file_id', key),
            meta
          };
          return [...project, fileUrlAndMetadata];
        }, []);
        return [...allProjectFileUrls, ...projectFileUrls];
      }, []);
    };

    const getPatternPrefix = (metadata: Record<string, any>) =>
      projectById[metadata?.data?.projectId].patternPrefix ?? null;

    const projectFilesTransformer = (
      response: ProjectFilesResponse,
      _prefixDir: string,
      index: number,
      transformerOptions: ProjectsTransformerResult[]
    ) => {
      const { document: { sharedPluginData = {} } = {} } = response;
      const sourceProvidedMetadata = transformerOptions[index].meta ?? {};
      const patternPrefix = getPatternPrefix(sourceProvidedMetadata);
      return Object.keys(sharedPluginData).reduce<FigmaPage[]>((figmaPagesResult, patternId) => {
        if (patternId.indexOf(patternPrefix) === 0) {
          /** Figma provided metadata */
          const { tags: tagsCSV, ...patternData } = sharedPluginData[patternId];
          const tags = tagsCSV?.split(',') || [];
          const figmaProvidedMetadata: Partial<FigmaPage> = {
            tags,
            data: {
              patternId,
              ...patternData
            }
          };

          const figmaPageMeta = deepmerge<FigmaPage, Partial<FigmaPage>>(
            figmaProvidedMetadata,
            sourceProvidedMetadata || {}
          );
          return [...figmaPagesResult, createFigmaPage(figmaPageMeta, prefixDir)];
        }
        return figmaPagesResult;
      }, []);
    };

    const generateThumbnailTransformer = (
      response: GenerateThumbnailResponse,
      _prefixDir: string,
      index: number,
      transformerOptions: GenerateThumbnailTransformerOptions
    ) => {
      const fileId = transformerOptions.fileIds[index];
      if (response.err) {
        console.error(`Figma returned ${response.err} for ${fileId} thumbnail generation `);
        return transformerOptions.pages;
      }
      const thumbnailNodes = Object.keys(response.images);
      thumbnailNodes.forEach(thumbnailNodeId => {
        const pageForNode = transformerOptions.pages.find(
          page => page.data.fileId === fileId && page.data.nodeId === thumbnailNodeId
        );
        if (pageForNode) {
          pageForNode.data.contentUrl = response.images[thumbnailNodeId];
        }
      });
      return transformerOptions.pages;
    };

    const projects$ = createHttpSource<ProjectsResponse, ProjectsTransformerResult>(
      {
        endpoints: Object.values(projectEndpoints),
        prefixDir,
        ...rest,
        requestHeaders: {
          'Content-Type': 'application/json',
          'X-FIGMA-TOKEN': figmaToken,
          ...rest.requestHeaders
        },
        transformer: projectsTransformer,
        transformerOptions: { projectIds: Object.keys(projectEndpoints) }
      },
      sourceConfig
    );

    const figmaPages$ = projects$.pipe(
      switchMap(projectFiles => {
        const fileUrls = projectFiles.map(item => item.fileUrl);

        return createHttpSource<ProjectFilesResponse, FigmaPage>({
          endpoints: fileUrls,
          prefixDir,
          ...rest,
          requestHeaders: {
            'Content-Type': 'application/json',
            'X-FIGMA-TOKEN': figmaToken,
            ...rest.requestHeaders
          },
          transformer: projectFilesTransformer,
          transformerOptions: projectFiles
        });
      })
    );

    const figmaPagesWithThumbnails$ = figmaPages$.pipe(
      switchMap(figmaPages => {
        const thumbnailNodes = figmaPages.reduce<Record<string, string[]>>(
          (thumbnailNodeMap, page) => {
            const { fileId } = page.data;
            if (thumbnailNodeMap[fileId]) {
              thumbnailNodeMap[fileId] = [...thumbnailNodeMap[fileId], page.data.nodeId];
            } else {
              thumbnailNodeMap[fileId] = [page.data.nodeId];
            }
            return thumbnailNodeMap;
          },
          {}
        );

        const thumbnailRequestUrls = Object.keys(thumbnailNodes).map(fileId => {
          const generateThumbnailUrl = endpoints.generateThumbnail.replace(':project_id', fileId);
          return generateThumbnailUrl.replace(':node_id', thumbnailNodes[fileId].join(','));
        });
        return createHttpSource<GenerateThumbnailResponse, FigmaPage>({
          endpoints: thumbnailRequestUrls,
          prefixDir,
          ...rest,
          requestHeaders: {
            'Content-Type': 'application/json',
            'X-FIGMA-TOKEN': figmaToken,
            ...rest.requestHeaders
          },
          transformer: generateThumbnailTransformer,
          transformerOptions: { fileIds: Object.keys(thumbnailNodes), pages: figmaPages }
        });
      })
    );
    return figmaPagesWithThumbnails$;
  }
};

export default FigmaSource;
