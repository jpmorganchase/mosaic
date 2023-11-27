import { map } from 'rxjs';
import { z } from 'zod';
import type { Source } from '@jpmorganchase/mosaic-types';
import { validateMosaicSchema } from '@jpmorganchase/mosaic-schemas';
import {
  createHttpSource,
  schema as httpSourceSchema,
  createProxyAgent
} from '@jpmorganchase/mosaic-source-http';

import createStorybookPages from './transformer.js';
import { StoriesResponseJSON, StorybookPage } from './types/index.js';

const baseSchema = httpSourceSchema.omit({
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
          url: z.string(),
          proxyEndpoint: z.string().url().optional(),
          additionalData: z.object({}).passthrough().optional(),
          additionalTags: z.array(z.string()).optional(),
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
      const { url, proxyEndpoint } = config;
      let agent;
      const headers = requestHeaders ? (requestHeaders as HeadersInit) : undefined;

      if (proxyEndpoint) {
        console.log(`[Mosaic] Storybook source using ${proxyEndpoint} proxy for ${url}`);
        agent = createProxyAgent(proxyEndpoint);
      }

      return new Request(`${url}/stories.json`, {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        agent,
        headers,
        timeout: requestTimeout
      });
    });

    const storybookHttpSource$ = createHttpSource<StoriesResponseJSON>(
      {
        prefixDir,
        ...restOptions,
        configuredRequests
      },
      sourceConfig
    );

    return storybookHttpSource$.pipe(
      map(responses =>
        responses.flatMap((storybookJsons, index) =>
          createStorybookPages(storybookJsons, prefixDir, index, storiesConfig)
        )
      )
    );
  }
};

export default StorybookSource;
