import { switchMap, of, tap, map } from 'rxjs';
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
  endpoints: true,
  transformerOptions: true
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
        dir: z.string().optional()
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
          ttl: cache.ttl
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
      const { document: { sharedPluginData = {} } = {}, lastModified } = response;
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
              lastModified,
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
    ).pipe(
      tap(summary => {
        if (summary.errors.length > 0) {
          console.error('[Mosaic][Source-Figma] Project fetch errors:');
          console.error(JSON.stringify(summary.errors, null, 2));
        }
      }),
      map(summary => summary.results.map(result => result.data))
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
        }).pipe(
          tap(summary => {
            if (summary.errors.length > 0) {
              console.error('[Mosaic][Source-Figma] Project files fetch errors:');
              console.error(JSON.stringify(summary.errors, null, 2));
            }
          }),
          map(summary => summary.results.map(result => result.data))
        );
      })
    );

    const figmaPagesWithThumbnails$ = figmaPages$.pipe(
      switchMap(figmaPages => {
        figmaPages.forEach(page => {
          if (page.data && !page.data.contentUrl) {
            page.data.contentUrl = undefined;
          }
        });

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

        const fileMetadata = figmaPages.reduce<Record<string, { lastModified: string }>>(
          (metadataMap, page) => {
            const { fileId } = page.data;
            if (!metadataMap[fileId]) {
              metadataMap[fileId] = {
                lastModified: page.data.lastModified || new Date().toISOString()
              };
            }
            return metadataMap;
          },
          {}
        );

        const filesToFetch: string[] = [];
        const fileIds = Object.keys(thumbnailNodes);

        if (thumbnailCache) {
          for (const fileId of fileIds) {
            const fileLastModified = fileMetadata[fileId]?.lastModified;
            const cachedThumbnails = thumbnailCache.getThumbnails(fileId, fileLastModified);
            if (cachedThumbnails) {
              console.log(
                `[Mosaic][Source-Figma] Using cached thumbnail files for ${fileId} (lastModified: ${fileLastModified})`
              );
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
            console.error(
              `[Source-Figma] Figma returned ${response.err} for ${fileId} thumbnail generation`
            );
          }
          if (thumbnailCache && !response.err && response.images) {
            const validThumbnails: Record<string, string> = {};
            for (const nodeId in response.images) {
              if (response.images[nodeId] && response.images[nodeId] !== null) {
                validThumbnails[nodeId] = response.images[nodeId];
              }
            }
            if (Object.keys(validThumbnails).length > 0) {
              const fileLastModified = fileMetadata[fileId]?.lastModified;
              thumbnailCache.storeThumbnails(fileId, validThumbnails, fileLastModified);
            }
          }
          if (response.images) {
            const thumbnailNodes = Object.keys(response.images);
            thumbnailNodes.forEach(thumbnailNodeId => {
              const pageForNode = transformerOptions.pages.find(
                page => page.data.fileId === fileId && page.data.nodeId === thumbnailNodeId
              );
              if (pageForNode && response.images[thumbnailNodeId]) {
                pageForNode.data.contentUrl = response.images[thumbnailNodeId];
              }
            });
          }

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
        }).pipe(
          tap(summary => {
            if (summary.errors.length > 0) {
              console.error('[Mosaic][Source-Figma] Thumbnail fetch errors:');
              console.error(JSON.stringify(summary.errors, null, 2));
            }
          }),
          map(summary => summary.results.map(result => result.data))
        );
      })
    );
    return figmaPagesWithThumbnails$;
  }
};

export default FigmaSource;
