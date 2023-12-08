import { map } from 'rxjs';
import { z } from 'zod';
import deepmerge from 'deepmerge';
import type { Source } from '@jpmorganchase/mosaic-types';
import { validateMosaicSchema } from '@jpmorganchase/mosaic-schemas';
import {
  createHttpSource,
  httpSourceCreatorSchema,
  createProxyAgent
} from '@jpmorganchase/mosaic-source-http';
import { ReadmePage } from './types/index.js';

const baseSchema = httpSourceCreatorSchema.omit({
  endpoints: true, // will be generated from the url in the readme object,
  noProxy: true, // proxy is specified per readme config.  Remove it if not needed for that readme
  transformerOptions: true // readme is the prop we need for this so no point duplicating it in source config
});

const readMeSchema = z.object({
  accessToken: z.string().optional(),
  proxyEndpoint: z.string().url().optional(),
  contentTemplate: z.string(),
  readmeUrl: z.string(),
  name: z.string(),
  meta: z.object({
    title: z.string(),
    description: z.string(),
    layout: z.string(),
    tags: z.array(z.string()).optional(),
    data: z.object({}).passthrough().optional()
  })
});
export const schema = baseSchema.merge(
  z.object({
    readme: z.array(readMeSchema).nonempty()
  })
);

const createReadmePage = (
  content: string,
  prefixDir: string,
  index: number,
  sourceOptions: ReadmeOptions[]
): ReadmePage[] => {
  const { contentTemplate, meta, name, readmeUrl } = sourceOptions[index];
  const { title, description } = meta;
  const route = `${prefixDir}/${name}`;
  const updatedContent = contentTemplate.replace('::content::', content);
  const sourceMeta: Omit<Partial<ReadmePage>, 'data'> & {
    data: { title: string; description: string; readmeUrl: string; link: string };
  } = {
    title,
    description,
    route,
    fullPath: `${route}.mdx`,
    data: {
      title,
      description,
      readmeUrl,
      link: route
    },
    content: updatedContent
  };
  const configMeta = meta as Partial<ReadmePage>;
  const readmePage = deepmerge<typeof sourceMeta, ReadmePage>(sourceMeta, configMeta);
  return [readmePage];
};

export type ReadmeSourceOptions = z.infer<typeof schema>;
export type ReadmeOptions = z.infer<typeof readMeSchema>;

const ReadmeSource: Source<ReadmeSourceOptions, ReadmePage> = {
  create(options, sourceConfig) {
    const parsedOptions = validateMosaicSchema(schema, options);
    const {
      requestTimeout,
      requestHeaders: requestHeadersParam,
      prefixDir,
      readme: readmeConfig,
      ...restOptions
    } = parsedOptions;
    const configuredRequests = readmeConfig.map(config => {
      const { accessToken, readmeUrl, proxyEndpoint } = config;
      let agent;

      if (proxyEndpoint) {
        console.log(`[Mosaic] Readme source using ${proxyEndpoint} proxy for ${readmeUrl}`);
        agent = createProxyAgent(proxyEndpoint);
      }

      let requestHeaders: HeadersInit = accessToken ? { Authorization: accessToken } : {};
      requestHeaders = { ...requestHeaders, 'Content-Type': 'text/html', ...requestHeadersParam };
      return new Request(`${readmeUrl}`, {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        agent,
        headers: requestHeaders,
        timeout: requestTimeout
      });
    });

    const readmeHttpSource$ = createHttpSource<string, ReadmePage>(
      {
        prefixDir,
        ...restOptions,
        configuredRequests,
        transformer: createReadmePage,
        transformerOptions: readmeConfig
      },
      sourceConfig
    );

    return readmeHttpSource$.pipe(map(pages => pages.flat()));
  }
};

export default ReadmeSource;
