import { from, Observable, forkJoin, tap, timer } from 'rxjs';
import { map, mergeMap, switchMap } from 'rxjs/operators';
import HttpsProxyAgent from 'https-proxy-agent';
import { z } from 'zod';
import type { Source } from '@jpmorganchase/mosaic-types';
import type { FigmaPage, FigmaPageData, Project, ProjectFiles } from './types/index.js';
import { sourceScheduleSchema, validateMosaicSchema } from '@jpmorganchase/mosaic-schemas';
import { fromHttpRequest, isErrorResponse } from '@jpmorganchase/mosaic-from-http-request';

export const schema = z.object({
  schedule: sourceScheduleSchema.optional(),
  prefixDir: z.string(),
  proxyEndpoint: z.string().url().optional(),
  figmaToken: z.string(),
  projects: z.array(z.number()).nonempty('Please provide a CSV of Figma project ids'),
  endpoints: z.object({
    getFile: z.string().url(),
    getProject: z.string().url()
  }),
  requestTimeout: z.number().default(5000)
});

export type FigmaSourceOptions = z.infer<typeof schema>;

const createFigmaPages = (pluginPageData: FigmaPageData[], prefixDir: string) => {
  return pluginPageData.reduce<FigmaPage[]>((result, page) => {
    const { name, description, patternId, tags } = page;
    const route = `${prefixDir}/${patternId}`.replace(/\./g, '_').toLowerCase();
    const pageTags = tags ? tags.split(',') : [];
    const figmaPage: FigmaPage = {
      title: name,
      description,
      layout: 'DetailTechnical',
      route,
      fullPath: `${route}.mdx`,
      tags: pageTags,
      data: { ...page, source: 'FIGMA' },
      content: ``
    };
    return [...result, figmaPage];
  }, []);
};

const FigmaSourceNext: Source<FigmaSourceOptions> = {
  create(options, { schedule }): Observable<FigmaPage[]> {
    const parsedOptions = validateMosaicSchema(schema, options);
    const { proxyEndpoint, endpoints, figmaToken, prefixDir, projects, requestTimeout } =
      parsedOptions;
    const delayMs = schedule.checkIntervalMins * 60000;
    const httpOptions = {
      agent: proxyEndpoint ? HttpsProxyAgent(proxyEndpoint) : undefined,
      timeout: requestTimeout,
      headers: {
        'Content-Type': 'application/json',
        'X-FIGMA-TOKEN': figmaToken
      }
    };

    return timer(schedule.initialDelayMs, delayMs)
      .pipe(
        switchMap(() => {
          console.log('checking for new Figma patterns');
          const projectFiles$ = projects.map((project: number) => {
            const getProjectURL = endpoints.getProject.replace(':project_id', project.toString());
            const getProjectRequest = new Request(getProjectURL, httpOptions);
            return fromHttpRequest<ProjectFiles>(getProjectRequest).pipe(
              map(projectFilesResponse => {
                if (isErrorResponse<ProjectFiles>(projectFilesResponse)) {
                  console.error(projectFilesResponse.message);
                  throw new Error(
                    `[Mosaic][Source] Unable to load Figma project from ${getProjectURL} `
                  );
                }
                const projectFileUrls = projectFilesResponse.files.reduce<string[]>(
                  (result, { key }) => {
                    const getProjectFileURL = endpoints.getFile.replace(':file_id', key);
                    return [...result, getProjectFileURL];
                  },
                  []
                );
                return projectFileUrls;
              })
            );
          });
          return forkJoin(projectFiles$).pipe(map(result => result.flat()));
        })
      )
      .pipe(
        mergeMap(projectFileUrls => {
          const Project$ = projectFileUrls.map<Observable<FigmaPage[]>>(getProjectFileURL => {
            const getProjectFileRequest = new Request(getProjectFileURL, httpOptions);
            return fromHttpRequest<Project>(getProjectFileRequest)
              .pipe(
                map(project => {
                  if (isErrorResponse<Project>(project)) {
                    throw new Error(
                      `[Mosaic][Source] Unable to load Figma project file from ${getProjectFileURL} `
                    );
                  }
                  const {
                    document: { sharedPluginData }
                  } = project;
                  const { jpmShared } = sharedPluginData;
                  const { patternIndex } = jpmShared as Record<string, string>;
                  const patternIds = patternIndex.split(',');

                  const pluginPageData = patternIds.reduce<FigmaPageData[]>(
                    (result, patternId) => [
                      ...result,
                      { patternId, ...sharedPluginData[patternId] }
                    ],
                    []
                  );
                  return createFigmaPages(pluginPageData, prefixDir);
                })
              )
              .pipe(tap(value => console.log('value emitted', value)));
          });
          const result = forkJoin(Project$).pipe(map(result => result.flat()));
          return from(result);
        })
      );
  }
};
export default FigmaSourceNext;
