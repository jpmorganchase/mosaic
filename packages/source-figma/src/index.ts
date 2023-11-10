import path from 'node:path';
import { Observable, filter, from, tap, toArray, mergeMap, of, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import forge from 'node-forge';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import type { Page, Source } from '@jpmorganchase/mosaic-types';
import { fromHttpRequest, isErrorResponse } from '@jpmorganchase/mosaic-from-http-request';
import { sourceScheduleSchema, validateMosaicSchema } from '@jpmorganchase/mosaic-schemas';
import type { Project, Tag, TagResponse } from './types/dxd-gallery.js';
import { toLower } from 'lodash-es';

export type FigmaPage = {
  content: string;
  description?: string;
  layout: string;
  data: Record<string, unknown>;
  tags?: string[];
} & Page;

export function hmacSha256Hex(
  api_key: string,
  nonce: string,
  requestTimeStamp: number,
  api_tkn: string
): string {
  const message = `${api_key}${nonce}${requestTimeStamp}`;
  const hmacT = forge.hmac.create();
  hmacT.start('sha256', api_tkn);
  hmacT.update(message);
  return hmacT.digest().toHex();
}

const createRequestHash = (apiKey: string = '', apiToken: string = ''): string => {
  const date = new Date();
  // 👇️ timestamp in seconds (Unix timestamp)
  const requestTimeStamp = Math.floor(date.getTime() / 1000);
  const uid = uuid();
  const response = hmacSha256Hex(apiKey, uid, requestTimeStamp, apiToken);
  return `h=${response}&ts=${requestTimeStamp}&hkey=${apiKey}&n=${uid}`;
};

export const schema = z.object({
  schedule: sourceScheduleSchema.optional(),
  proxyEndpoint: z.string().url().optional(),
  prefixDir: z.string(),
  coverUrlPrefix: z.string(),
  endpoints: z.object({
    getAllTags: z.string().url(),
    getAllProjectsForTag: z.string().url(),
    getProject: z.string().url()
  }),
  requestTimeout: z.number().default(5000)
});

export type FigmaSourceOptions = z.infer<typeof schema>;

const FigmaSource: Source<FigmaSourceOptions> = {
  create(options, { schedule }): Observable<FigmaPage[]> {
    const parsedOptions = validateMosaicSchema(schema, options);
    const { coverUrlPrefix, endpoints, prefixDir, requestTimeout } = parsedOptions;
    console.log('>>>>', endpoints);
    const delayMs = schedule.checkIntervalMins * 60000;

    const requestConfig = {
      //agent: proxyEndpoint ? new HttpsProxyAgent(proxyEndpoint) : undefined,
      timeout: requestTimeout,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const requestHash = createRequestHash(process.env.API_KEY, process.env.API_TKN);
    const requestURL = new URL(endpoints.getAllTags);
    requestURL.search = requestURL.search ? `&${requestHash}` : `?${requestHash}`;
    const request = new Request(requestURL.toString(), requestConfig);

    return timer(schedule.initialDelayMs, delayMs)
      .pipe(switchMap(() => fromHttpRequest<TagResponse>(request)))
      .pipe(
        switchMap(response => {
          if (isErrorResponse(response)) {
            throw new Error('[Mosaic][Source] Figma get all tags request failed');
          }
          return from<Tag[]>(response.data);
        }),
        filter(item => item.name === 'Salt')
      )
      .pipe(
        switchMap(saltTag => {
          const requestURL = new URL(endpoints.getAllProjectsForTag);
          requestURL.search = requestURL.search
            ? `${requestURL.search}&${requestHash}&areaOfWork=${saltTag.id}`
            : `?${requestHash}&areaOfWork=${saltTag.id}`;
          const request = new Request(requestURL.toString(), requestConfig);
          return fromHttpRequest<Project[]>(request).pipe(
            switchMap(response => {
              if (isErrorResponse(response)) {
                throw new Error('[Mosaic][Source] Figma get Salt tagged projects');
              }
              return from(response);
            })
          );
        })
      )
      .pipe(
        switchMap(project => {
          const requestURL = new URL(`${endpoints.getProject}/${project.figmaId}`);
          requestURL.search = requestURL.search
            ? `${requestURL.search}&${requestHash}`
            : `?${requestHash}`;

          const request = new Request(requestURL.toString(), requestConfig);
          return fromHttpRequest<Project>(request).pipe(
            mergeMap(response => {
              if (isErrorResponse(response)) {
                throw new Error('[Mosaic][Source] Figma get Salt tagged projects');
              }
              const {
                figmaId,
                projectTitle: title,
                projectSubtitle: description = undefined,
                tags,
                ...data
              } = response;
              const page: FigmaPage = {
                title,
                description: description || `community pattern for ${title}`,
                layout: 'DetailTechnical',
                route: `${path.join('/', prefixDir, figmaId)}`,
                fullPath: `${path.join('/', prefixDir, figmaId)}.mdx`,
                tags: [...tags.map(toLower)],
                data: {
                  ...data,
                  link: `${prefixDir}/${figmaId.toLowerCase()}`,
                  coverUrl: `${coverUrlPrefix}/${data.coverUrl}`,
                  title
                },
                content: `
# {meta.title }
{meta.description}
<img src={meta.data.images[0].url} />
<img src={meta.data.images[1].url} />
<img src={meta.data.images[2].url} />
`
              };
              return of(page);
            }),
            toArray()
          );
        })
      )
      .pipe(tap(value => console.log('value emitted', value)));
  }
};

export default FigmaSource;
