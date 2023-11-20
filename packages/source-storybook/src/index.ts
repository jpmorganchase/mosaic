import { Observable, forkJoin, timer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import HttpsProxyAgent from 'https-proxy-agent';
import { z } from 'zod';
import type { Source } from '@jpmorganchase/mosaic-types';
import { sourceScheduleSchema, validateMosaicSchema } from '@jpmorganchase/mosaic-schemas';
import { fromHttpRequest, isErrorResponse } from '@jpmorganchase/mosaic-from-http-request';
import { StoriesResponseJSON, StorybookPage, StoryConfig } from './types/index.js';

// @ts-ignore
export const schema = z.object({
  schedule: sourceScheduleSchema.optional(),
  prefixDir: z.string(),
  proxyEndpoint: z.string().url().optional(),
  stories: z.array(
    z.object({
      description: z.string(),
      url: z.string(),
      additionalData: z.object({}).passthrough().optional(),
      additionalTags: z.array(z.string()).optional(),
      filter: z
        .any({ required_error: 'A regex is required to filter stories' })
        .transform(val => new RegExp(val))
        .optional(),
      filterTags: z.array(z.string()).optional()
    })
  ),
  requestTimeout: z.number().default(5000)
});

export type StorybookSourceOptions = z.infer<typeof schema>;

const createStorybookPages = (
  storyJSON: StoriesResponseJSON,
  storyConfig: StoryConfig,
  prefixDir: string
): StorybookPage[] => {
  const {
    additionalData,
    additionalTags = [],
    description,
    filter,
    filterTags,
    url: storybookUrl
  } = storyConfig;
  const storyIds = Object.keys(storyJSON.stories);
  return storyIds.reduce<StorybookPage[]>((result, storyId) => {
    const story = storyJSON.stories[storyId];
    if (filter && !filter.test(story.kind)) {
      return result;
    }
    if (filterTags && !filterTags.some(filterTag => story.tags.indexOf(filterTag) >= 0)) {
      return result;
    }
    const { id, kind, name, tags, story: storyName } = story;
    const title = `${kind} - ${name}`;
    const route = `${prefixDir}/${id}`;
    const pageTags = [...tags.filter(tag => tag.indexOf('salt-pattern-') >= 0), ...additionalTags];
    const storyPage: StorybookPage = {
      title,
      layout: 'DetailTechnical',
      route,
      fullPath: `${route}.mdx`,
      tags: pageTags,
      data: {
        id,
        description,
        kind,
        link: `${storybookUrl}/iframe.html?id=${id}&viewMode=story&shortcuts=false&singleStory=true`,
        name,
        source: 'STORYBOOK',
        story: storyName,
        ...additionalData
      },
      content: ``
    };
    return [...result, storyPage];
  }, []);
};

const StorybookSource: Source<StorybookSourceOptions> = {
  create(options, { schedule }): Observable<StorybookPage[]> {
    // @ts-ignore
    const parsedOptions = validateMosaicSchema(schema, options);
    const { proxyEndpoint, prefixDir, stories: storiesConfig, requestTimeout } = parsedOptions;
    const delayMs = schedule.checkIntervalMins * 60000;
    const httpOptions = {
      agent: proxyEndpoint ? HttpsProxyAgent(proxyEndpoint) : undefined,
      timeout: requestTimeout,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    return timer(schedule.initialDelayMs, delayMs).pipe(
      switchMap(() => {
        console.log('checking for new Storybook patterns', delayMs, schedule, options);
        const projectFiles$: Observable<StorybookPage[]>[] = storiesConfig.map(
          (storyConfig: StoryConfig) => {
            const { url } = storyConfig;
            const getStoryUrl = `${url}/stories.json`;
            const getStoryRequest = new Request(getStoryUrl, httpOptions);
            return fromHttpRequest<StoriesResponseJSON>(getStoryRequest).pipe(
              map(storiesResponse => {
                if (isErrorResponse<StoriesResponseJSON>(storiesResponse)) {
                  console.error(
                    `[Mosaic][Source] Unable to load Storybook project from ${getStoryUrl} `
                  );
                  console.error(storiesResponse.message);
                  return [];
                }
                return createStorybookPages(storiesResponse, storyConfig, prefixDir);
              })
            );
          }
        );
        return forkJoin(projectFiles$).pipe(map(result => result.flat()));
      })
    );
  }
};
export default StorybookSource;
