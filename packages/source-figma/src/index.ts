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

import createFigmaPage from './transformer.js';
import type {
  FigmaPage,
  FileUrlAndMeta,
  ProjectFilesResponseJson,
  ProjectResponseJson
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
      getProject: z.string().url()
    }),
    requestTimeout: z.number().default(5000)
  })
);

export type FigmaSourceOptions = z.infer<typeof schema>;

const FigmaSource: Source<FigmaSourceOptions, FigmaPage> = {
  create(options, sourceConfig) {
    const parsedOptions = validateMosaicSchema(schema, options);

    const {
      endpoints,
      projects,
      figmaToken,
      proxyEndpoint,
      prefixDir,
      requestHeaders: requestHeadersParam
    } = parsedOptions;

    const projectEndpoints = projects.map(project =>
      endpoints.getProject.replace(':project_id', project.id.toString())
    );

    const projectsTransformer: HttpSourceResponseTransformerType<
      ProjectFilesResponseJson,
      FileUrlAndMeta
    > = (response: ProjectFilesResponseJson, _prefixDir, index) =>
      [response].reduce<FileUrlAndMeta[]>((allProjectFileUrls, { files }) => {
        const projectFileUrls = files.reduce<FileUrlAndMeta[]>((project, { key }) => {
          const fileUrlAndMetadata = {
            fileUrl: endpoints.getFile.replace(':file_id', key),
            meta: projects[index].meta
          };

          return [...project, fileUrlAndMetadata];
        }, []);
        return [...allProjectFileUrls, ...projectFileUrls];
      }, []);

    const projectFilesTransformer = (
      response: ProjectResponseJson,
      _prefixDir: string,
      index: number,
      transformerOptions: FileUrlAndMeta[]
    ) => {
      const {
        document: { sharedPluginData }
      } = response;
      const { patternPrefix } = projects[index];
      return Object.keys(sharedPluginData).reduce<FigmaPage[]>((figmaPagesResult, patternId) => {
        if (patternId.indexOf(patternPrefix) === 0) {
          /** Figma provided metadata */
          const figmaProvidedMetadata: Partial<FigmaPage> = {
            data: {
              patternId,
              ...sharedPluginData[patternId]
            }
          };
          const sourceProvidedMetadata = transformerOptions[index].meta;

          const figmaPageMeta = sourceProvidedMetadata
            ? deepmerge<FigmaPage, Record<string, unknown>>(
                figmaProvidedMetadata,
                sourceProvidedMetadata || {}
              )
            : figmaProvidedMetadata;
          return [...figmaPagesResult, createFigmaPage(figmaPageMeta, prefixDir)];
        }
        return figmaPagesResult;
      }, []);
    };

    const projects$ = createHttpSource<ProjectFilesResponseJson, FileUrlAndMeta>(
      {
        endpoints: projectEndpoints,
        requestHeaders: {
          'Content-Type': 'application/json',
          'X-FIGMA-TOKEN': figmaToken,
          ...requestHeadersParam
        },
        proxyEndpoint,
        prefixDir,
        transformer: projectsTransformer
      },
      sourceConfig
    );

    const figmaSource$ = projects$.pipe(
      switchMap(fileUrlAndMetaCollection => {
        const fileUrls = fileUrlAndMetaCollection.map(item => item.fileUrl);

        return createHttpSource<ProjectResponseJson, FigmaPage>({
          endpoints: fileUrls,
          requestHeaders: {
            'Content-Type': 'application/json',
            'X-FIGMA-TOKEN': figmaToken,
            ...requestHeadersParam
          },
          proxyEndpoint,
          prefixDir,
          transformer: projectFilesTransformer,
          transformerOptions: fileUrlAndMetaCollection
        });
      })
    );

    return figmaSource$;
  }
};

export default FigmaSource;
