import { map, Observable } from 'rxjs';
import { z } from 'zod';
import type { Page, Source } from '@jpmorganchase/mosaic-types';
import { validateMosaicSchema } from '@jpmorganchase/mosaic-schemas';
import HttpSource, { schema as httpSourceSchema } from '@jpmorganchase/mosaic-source-http';

import createStorybookPages from './transformer.js';
import { StoriesResponseJSON } from './types/index.js';

const baseSchema = httpSourceSchema.omit({
  endpoints: true, // will be generated from the url in the stories object,
  transformerOptions: true // stories is the prop we need for this so no point duplicating it in source config
});

export const schema = baseSchema.merge(
  z.object({
    stories: z
      .array(
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
      )
      .nonempty()
  })
);

export type StorybookSourceOptions = z.infer<typeof schema>;

const StorybookSource: Source<StorybookSourceOptions> = {
  create(options, sourceConfig): Observable<Page[]> {
    const parsedOptions = validateMosaicSchema(schema, options);
    const { prefixDir, stories: storiesConfig, ...restOptions } = parsedOptions;

    const storybookPages$ = HttpSource.create(
      {
        prefixDir,
        requestHeaders: {
          'Content-Type': 'application/json'
        },
        ...restOptions,
        endpoints: storiesConfig.map(config => `${config.url}/stories.json`)
      },
      sourceConfig
    );

    return storybookPages$.pipe(
      map(responses =>
        // TODO: why is flatMap needed?
        responses.flatMap((response, index) => {
          const stories = response as unknown as StoriesResponseJSON;
          return createStorybookPages(stories, prefixDir, index, storiesConfig);
        })
      )
    );
  }
};

export default StorybookSource;
