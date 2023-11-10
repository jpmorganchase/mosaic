import { Observable, forkJoin, timer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import HttpsProxyAgent from 'https-proxy-agent';
import { z } from 'zod';
import type { Source } from '@jpmorganchase/mosaic-types';
import { sourceScheduleSchema, validateMosaicSchema } from '@jpmorganchase/mosaic-schemas';
import { fromHttpRequest, isErrorResponse } from '@jpmorganchase/mosaic-from-http-request';
import { StoriesJSON, StorybookPage, StoryConfig } from './types/index.js';

export const schema = z.object({
  schedule: sourceScheduleSchema.optional(),
  prefixDir: z.string(),
  proxyEndpoint: z.string().url().optional(),
  stories: z.array(
    z.object({
      url: z.string(),
      owner: z.string(),
      additionalTags: z.array(z.string()).optional(),
      filter: z
        .any({ required_error: 'A regex is required to filter stories' })
        .transform(val => new RegExp(val))
    })
  ),
  requestTimeout: z.number().default(5000)
});

export type FigmaSourceOptions = z.infer<typeof schema>;

const createStorybookPages = (
  storyJSON: StoriesJSON,
  storyConfig: StoryConfig,
  prefixDir: string
): StorybookPage[] => {
  const { additionalTags = [], owner, filter, url: storybookUrl } = storyConfig;
  const storyIds = Object.keys(storyJSON.stories);
  return storyIds.reduce<StorybookPage[]>((result, storyId) => {
    const story = storyJSON.stories[storyId];
    if (!filter.test(story.kind)) {
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
        kind,
        link: `${storybookUrl}/iframe.html?id=${id}&viewMode=story&shortcuts=false&singleStory=true`,
        name,
        owner,
        source: 'STORYBOOK',
        story: storyName
      },
      content: ``
    };
    return [...result, storyPage];
  }, []);
};

const StorybookSource: Source<FigmaSourceOptions> = {
  create(options, { schedule }): Observable<StorybookPage[]> {
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
        const projectFiles$ = storiesConfig.map(storyConfig => {
          const { url } = storyConfig;
          const getStoryUrl = `${url}/stories.json`;
          const getStoryRequest = new Request(getStoryUrl, httpOptions);
          return fromHttpRequest<StoriesJSON>(getStoryRequest).pipe(
            map(storiesResponse => {
              if (isErrorResponse<StoriesJSON>(storiesResponse)) {
                console.error(storiesResponse.message);
                throw new Error(
                  `[Mosaic][Source] Unable to load Figma project from ${getStoryUrl} `
                );
              }
              return createStorybookPages(storiesResponse, storyConfig, prefixDir);
            })
          );
        });
        return forkJoin(projectFiles$).pipe(map(result => result.flat()));
      })
    );
  }
};
export default StorybookSource;
