import { Observable } from 'rxjs';
import { z } from 'zod';
import type { Page, Source } from '@jpmorganchase/mosaic-types';
import { validateMosaicSchema } from '@jpmorganchase/mosaic-schemas';
import HttpSource, { schema as httpSourceSchema } from '@jpmorganchase/mosaic-source-http';
import { fileURLToPath } from 'node:url';

const defaultStorybookTransformer = fileURLToPath(new URL('./transformer.js', import.meta.url));

const baseSchema = httpSourceSchema.omit({
  endpoints: true, // will be generated from the url in the stories object,
  transformResponseToPagesModulePath: true, // this is optional for this source as there is a default
  transformerOptions: true // stories is the prop we need for this so no point duplicating it in source config
});

export const schema = baseSchema.merge(
  z.object({
    transformResponseToPagesModulePath: z.string().default(defaultStorybookTransformer),
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
    const { stories: storiesConfig, ...restOptions } = parsedOptions;

    const storybookPages$ = HttpSource.create(
      {
        ...restOptions,
        endpoints: storiesConfig.map(config => `${config.url}/stories.json`),
        transformerOptions: storiesConfig,
        requestHeaders: {
          'Content-Type': 'application/json'
        }
      },
      sourceConfig
    );

    return storybookPages$;
  }
};

export default StorybookSource;
