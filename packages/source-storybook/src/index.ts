import { map } from 'rxjs';
import { z } from 'zod';
import type { Source } from '@jpmorganchase/mosaic-types';
import { validateMosaicSchema } from '@jpmorganchase/mosaic-schemas';
import { createHttpSource, httpSourceCreatorSchema } from '@jpmorganchase/mosaic-source-http';
import deepmerge from 'deepmerge';
import { ProxyAgent, Request, HeadersInit } from 'undici';

import { StoriesResponseJSON, StorybookPage, StoryConfig } from './types/index.js';
import { normalizeStorybookJson } from './stories.js';

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
  const normalizedJson = normalizeStorybookJson(storyJSON);
  const storyIds = Object.keys(normalizedJson.entries);
  return storyIds.reduce<StorybookPage[]>((result, storyId) => {
    const story = normalizedJson.entries[storyId];
    const { id, type, name, title: storyTitle, tags } = story;
    if (filter && !filter.test(storyTitle)) {
      return result;
    }
    if (
      filterTags &&
      filterTags.some(filterTag => Array.isArray(tags) && tags.indexOf(filterTag) >= 0)
    ) {
      return result;
    }

    const title = `${storyTitle} - ${name}`;
    const route = `${prefixDir}/${id}`;
    let storyPageMeta: StorybookPage = {
      title,
      route,
      fullPath: `${route}.json`,
      data: {
        type,
        id,
        name,
        title: storyTitle,
        description,
        contentUrl: `${storyUrlPrefix}/iframe.html?id=${id}&viewMode=story&shortcuts=false&singleStory=true`,
        link: `${storyUrlPrefix}/index.html?path=/${type}/${id}`
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
      let dispatcher;
      const headers = requestHeaders ? (requestHeaders as HeadersInit) : undefined;

      if (proxyEndpoint) {
        console.log(`[Mosaic] Storybook source using ${proxyEndpoint} proxy for ${storiesUrl}`);
        dispatcher = new ProxyAgent(proxyEndpoint);
      }
      const url = storiesUrl || `${storyUrlPrefix}/index.json`;
      return new Request(url, {
        dispatcher,
        headers,
        signal: AbortSignal.timeout(requestTimeout)
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
