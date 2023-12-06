import { merge, mergeMap, map } from 'rxjs';
import { z } from 'zod';
import deepmerge from 'deepmerge';
import type { Source } from '@jpmorganchase/mosaic-types';
import { validateMosaicSchema } from '@jpmorganchase/mosaic-schemas';
import {
  createHttpSource,
  createProxyAgent,
  schema as httpSourceSchema
} from '@jpmorganchase/mosaic-source-http';

import createFigmaPage from './transformer.js';
import { FigmaPage, ProjectFilesResponseJson, ProjectResponseJson } from './types/index.js';

const JPM_PATTERN_PREFIX = 'jpmSaltPattern.';

const baseSchema = httpSourceSchema.omit({
  endpoints: true, // will be generated from the url in the stories object,
  transformerOptions: true // stories is the prop we need for this so no point duplicating it in source config
});

const defaultRequestHeaders: HeadersInit = {
  'Content-Type': 'application/json',
  'X-FIGMA-TOKEN': process.env.FIGMA_TOKEN || ''
};
export const schema = baseSchema.merge(
  z.object({
    prefixDir: z.string(),
    figmaToken: z.string(),
    projects: z.array(
      z.object({
        id: z.number(),
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

type ProjectRequestAndOptions = { request: Request; meta: Partial<FigmaPage> };

function createProjectRequestsAndOptions({
  endpoints,
  projects,
  proxyEndpoint,
  requestTimeout,
  requestHeaders
}: FigmaSourceOptions): { request: Request; meta: Partial<FigmaPage> }[] {
  return projects.map<ProjectRequestAndOptions>(({ id, meta }) => {
    let agent;
    const getProjectURL = endpoints.getProject.replace(':project_id', id.toString());
    const headers = requestHeaders ? (requestHeaders as HeadersInit) : defaultRequestHeaders;
    if (proxyEndpoint) {
      agent = createProxyAgent(proxyEndpoint);
    }

    const request = new Request(getProjectURL, {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      agent,
      headers,
      timeout: requestTimeout
    });
    return { request, meta };
  });
}

function createProjectFileRequests(
  projectFileUrls: string[],
  { proxyEndpoint, requestHeaders, requestTimeout }: FigmaSourceOptions
) {
  return projectFileUrls.map(projectFileURL => {
    let agent;
    const headers = requestHeaders ? (requestHeaders as HeadersInit) : defaultRequestHeaders;
    if (proxyEndpoint) {
      agent = createProxyAgent(proxyEndpoint);
    }
    return new Request(projectFileURL, {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      agent,
      headers,
      timeout: requestTimeout
    });
  });
}

const FigmaSource: Source<FigmaSourceOptions, FigmaPage> = {
  create(options, sourceConfig) {
    const parsedOptions = validateMosaicSchema(schema, options);

    const {
      requestTimeout,
      requestHeaders,
      prefixDir,
      proxyEndpoint,
      projects,
      endpoints,
      ...restOptions
    } = parsedOptions;

    const requestsAndOptions = createProjectRequestsAndOptions(parsedOptions);
    // Get a list of project file descriptors for each configured project group
    const configuredRequests = requestsAndOptions.map(
      requestAndOptions => requestAndOptions.request
    );
    const figmaProjectsHttpSource$ = createHttpSource<ProjectFilesResponseJson>(
      {
        prefixDir,
        ...restOptions,
        configuredRequests
      },
      sourceConfig
    ).pipe(
      map(projectsResponse => {
        return projectsResponse.reduce<string[]>((allProjectFileUrls, { files }) => {
          const projectFileUrls = files.reduce<string[]>((project, { key }) => {
            const getProjectFileURL = endpoints.getFile.replace(':file_id', key);
            return [...project, getProjectFileURL];
          }, []);
          return [...allProjectFileUrls, ...projectFileUrls];
        }, []);
      })
    );

    const figmaSource$ = figmaProjectsHttpSource$.pipe(
      map(projectResponses => {
        const configuredProjectFileRequests = createProjectFileRequests(
          projectResponses,
          parsedOptions
        );
        const figmaProjectFilesHttpSource$ = createHttpSource<ProjectResponseJson>(
          {
            prefixDir,
            ...restOptions,
            configuredRequests: configuredProjectFileRequests
          },
          sourceConfig
        );
        return figmaProjectFilesHttpSource$.pipe(
          map(projectsResponse => {
            return projectsResponse.reduce<FigmaPage[]>((projectFile, response, responseIndex) => {
              const {
                document: { sharedPluginData }
              } = response;
              const figmaPages = Object.keys(sharedPluginData).reduce<FigmaPage[]>(
                (figmaPagesResult, patternId) => {
                  if (patternId.indexOf(JPM_PATTERN_PREFIX) === 0) {
                    /** Figma provided metadata */
                    const figmaProvidedMetadata: Partial<FigmaPage> = {
                      data: {
                        patternId,
                        ...sharedPluginData[patternId]
                      }
                    };
                    const sourceProvidedMetadata = requestsAndOptions[responseIndex].meta;
                    const figmaPageMeta = requestsAndOptions[responseIndex]
                      ? deepmerge<FigmaPage, FigmaPage>(
                          figmaProvidedMetadata,
                          sourceProvidedMetadata
                        )
                      : figmaProvidedMetadata;
                    return [...figmaPagesResult, createFigmaPage(figmaPageMeta, prefixDir)];
                  }
                  return figmaPagesResult;
                },
                []
              );
              return [...projectFile, ...figmaPages];
            }, []);
          })
        );
      })
    );
    return figmaSource$.pipe(mergeMap(res => merge(res)));
  }
};

export default FigmaSource;
