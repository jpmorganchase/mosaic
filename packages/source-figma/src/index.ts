import { switchMap, of } from 'rxjs';
import { z } from 'zod';
import deepmerge from 'deepmerge';
import path from 'path';
import type { Source } from '@jpmorganchase/mosaic-types';
import { validateMosaicSchema } from '@jpmorganchase/mosaic-schemas';
import {
  createHttpSource,
  httpSourceCreatorSchema,
  HttpSourceResponseTransformerType
} from '@jpmorganchase/mosaic-source-http';
import { ThumbnailCache } from './utils/thumbnailCache.js';

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
    requestTimeout: z.number().default(5000),
    cache: z
      .object({
        ttl: z.number().default(24 * 60 * 60 * 1000),
        dir: z.string().optional(),
        maxCacheAge: z.number().optional(),
        cleanupIntervalMs: z.number().optional()
      })
      .optional()
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

    const { endpoints, projects, figmaToken, prefixDir, cache, ...rest } = parsedOptions;

    const thumbnailCache = cache
      ? new ThumbnailCache({
          cacheDir: cache.dir || path.join(process.cwd(), '.tmp', '.cache', 'figma-thumbnails'),
          ttl: cache.ttl,
          maxCacheAge: cache.maxCacheAge,
          cleanupIntervalMs: cache.cleanupIntervalMs
        })
      : null;

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
        const filesToFetch: string[] = [];
        const fileIds = Object.keys(thumbnailNodes);

        if (thumbnailCache) {
          for (const fileId of fileIds) {
            const cachedThumbnails = thumbnailCache.getThumbnails(fileId);
            if (cachedThumbnails) {
              console.log(`[Figma-Source] Using cached thumbnails for file ${fileId}`);
              for (const page of figmaPages) {
                if (
                  page.data.fileId === fileId &&
                  cachedThumbnails[page.data.nodeId] &&
                  cachedThumbnails[page.data.nodeId] !== null
                ) {
                  page.data.contentUrl = cachedThumbnails[page.data.nodeId];
                }
              }
            } else {
              filesToFetch.push(fileId);
            }
          }
        } else {
          filesToFetch.push(...fileIds);
        }
        if (filesToFetch.length === 0) {
          return of(figmaPages);
        }
        const thumbnailRequestUrls = filesToFetch.map(fileId => {
          const generateThumbnailUrl = endpoints.generateThumbnail.replace(':project_id', fileId);
          return generateThumbnailUrl.replace(':node_id', thumbnailNodes[fileId].join(','));
        });

        const cachedThumbnailTransformer = (
          response: GenerateThumbnailResponse,
          _prefixDir: string,
          index: number,
          transformerOptions: GenerateThumbnailTransformerOptions
        ) => {
          const fileId = transformerOptions.fileIds[index];
          if (response.err) {
            console.error(`Figma returned ${response.err} for ${fileId} thumbnail generation`);
            return transformerOptions.pages;
          }
          if (thumbnailCache && !response.err) {
            const validThumbnails: Record<string, string> = {};
            for (const nodeId in response.images) {
              if (response.images[nodeId] && response.images[nodeId] !== null) {
                validThumbnails[nodeId] = response.images[nodeId];
              }
            }
            thumbnailCache.storeThumbnails(fileId, validThumbnails);
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

        return createHttpSource<GenerateThumbnailResponse, FigmaPage>({
          endpoints: thumbnailRequestUrls,
          prefixDir,
          ...rest,
          requestHeaders: {
            'Content-Type': 'application/json',
            'X-FIGMA-TOKEN': figmaToken,
            ...rest.requestHeaders
          },
          transformer: cachedThumbnailTransformer,
          transformerOptions: { fileIds: filesToFetch, pages: figmaPages }
        });
      })
    );
    return figmaPagesWithThumbnails$;
  }
};

export default FigmaSource;
