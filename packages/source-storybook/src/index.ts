import { map } from 'rxjs';
import { z } from 'zod';
import type { Source } from '@jpmorganchase/mosaic-types';
import { validateMosaicSchema } from '@jpmorganchase/mosaic-schemas';
import {
  createHttpSource,
  httpSourceCreatorSchema,
  createProxyAgent
} from '@jpmorganchase/mosaic-source-http';

import { StoriesResponseJSON, StorybookPage, StoryConfig } from './types/index.js';
import deepmerge from 'deepmerge';

const baseSchema = httpSourceCreatorSchema.omit({
  endpoints: true, // will be generated from the url in the stories object,
  noProxy: true, // proxy is specified per storybook config.  Remove it if not needed for that storybook
  transformerOptions: true // stories is the prop we need for this so no point duplicating it in source config
});

export const schema = baseSchema.merge(
  z.object({
    stories: z
      .array(
        z.object({
          description: z.string(),
          storiesUrl: z.string().url().optional(),
          storyUrlPrefix: z.string().url(),
          proxyEndpoint: z.string().url().optional(),
          meta: z
            .object({ tags: z.array(z.string()).optional(), data: z.object({}).passthrough() })
            .optional(),
          filter: z
            .any()
            .transform(val => new RegExp(val))
            .optional(),
          filterTags: z.array(z.string()).optional()
        })
      )
      .nonempty()
  })
);

export type StorybookSourceOptions = z.infer<typeof schema>;

const transformStorybookPages = (
  storyJSON: StoriesResponseJSON,
  prefixDir: string,
  index: number,
  storyConfig: StoryConfig[]
): StorybookPage[] => {
  const { meta = {}, description, filter, filterTags, storyUrlPrefix } = storyConfig[index];
  const storyIds = Object.keys(storyJSON.stories);
  return storyIds.reduce<StorybookPage[]>((result, storyId) => {
    const story = storyJSON.stories[storyId];
    if (filter && !filter.test(story.kind)) {
      return result;
    }
    if (filterTags && filterTags.some(filterTag => story.tags.indexOf(filterTag) >= 0)) {
      return result;
    }
    const { id, kind, name, story: storyName } = story;
    const title = `${kind} - ${name}`;
    const route = `${prefixDir}/${id}`;
    let storyPageMeta: StorybookPage = {
      title,
      route,
      fullPath: `${route}.json`,
      data: {
        id,
        description,
        kind,
        contentUrl: `${storyUrlPrefix}/iframe.html?id=${id}&viewMode=story&shortcuts=false&singleStory=true`,
        link: `${storyUrlPrefix}?id=${id}`,
        name,
        story: storyName
      }
    };
    if (meta) {
      storyPageMeta = deepmerge<StorybookPage, Partial<StorybookPage>>(storyPageMeta, meta);
    }
    return [...result, storyPageMeta];
  }, []);
};

const StorybookSource: Source<StorybookSourceOptions, StorybookPage> = {
  create(options, sourceConfig) {
    const parsedOptions = validateMosaicSchema(schema, options);
    const {
      requestTimeout,
      requestHeaders,
      prefixDir,
      stories: storiesConfig,
      ...restOptions
    } = parsedOptions;

    const configuredRequests = storiesConfig.map(config => {
      const { storiesUrl, storyUrlPrefix, proxyEndpoint } = config;
      let agent;
      const headers = requestHeaders ? (requestHeaders as HeadersInit) : undefined;

      if (proxyEndpoint) {
        console.log(`[Mosaic] Storybook source using ${proxyEndpoint} proxy for ${storiesUrl}`);
        agent = createProxyAgent(proxyEndpoint);
      }
      const url = storiesUrl || `${storyUrlPrefix}/stories.json`;
      return new Request(url, {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        agent,
        headers,
        timeout: requestTimeout
      });
    });

    const storybookHttpSource$ = createHttpSource<StoriesResponseJSON, StorybookPage>(
      {
        prefixDir,
        ...restOptions,
        configuredRequests,
        transformer: transformStorybookPages,
        transformerOptions: storiesConfig
      },
      sourceConfig
    );

    return storybookHttpSource$.pipe(map(pages => pages.flat()));
  }
};

export default StorybookSource;
