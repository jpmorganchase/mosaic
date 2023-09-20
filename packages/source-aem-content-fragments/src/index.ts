import { Observable, timer } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { z } from 'zod';
import type { Page, Source } from '@jpmorganchase/mosaic-types';
import { fromHttpRequest, isErrorResponse } from '@jpmorganchase/mosaic-from-http-request';
import proxyAgentPkg from 'https-proxy-agent';
import { sourceScheduleSchema, validateMosaicSchema } from '@jpmorganchase/mosaic-schemas';

const { HttpsProxyAgent } = proxyAgentPkg;

interface ComponentDescriptor extends Page {
  descriptor: { id: string; fragmentEndpoint: string };
  proxyEndpoint?: string;
}

export const schema = z.object({
  schedule: sourceScheduleSchema.optional(),
  proxyEndpoint: z.string().url(),
  endpoint: z.string().url(),
  prefixDir: z.string().optional(),
  folderPath: z.string(),
  fragmentUrl: z.string().url()
});

function mapContentFragmentToComponentDescriptor(
  contentFragments: any[],
  fragmentUrl: string,
  prefixDir?: string,
  proxyEndpoint?: string
) {
  const descriptors: ComponentDescriptor[] = [];

  contentFragments.forEach(contentFragment => {
    const name = Object.keys(contentFragment)[0];
    const details = contentFragment[name];
    const isFragment = details['jcr:content']?.contentFragment;
    if (isFragment) {
      const requestUrl = new URL(`${fragmentUrl}/${name}.json`);

      const fullPath = prefixDir ? `/${prefixDir}/${name}.json` : `/${name}.json`;
      const descriptor: ComponentDescriptor = {
        fullPath,
        descriptor: {
          id: name,
          fragmentEndpoint: requestUrl.toString()
        },
        proxyEndpoint
      };
      descriptors.push(descriptor);
    }
  });
  return descriptors;
}

export type AemSourceOptions = z.infer<typeof schema>;

const AemSource: Source<AemSourceOptions> = {
  create(options, { schedule }): Observable<Page[]> {
    const { endpoint, folderPath, fragmentUrl, prefixDir, proxyEndpoint } = validateMosaicSchema(
      schema,
      options
    );
    const delayMs = schedule.checkIntervalMins * 60000;

    const agent = new HttpsProxyAgent(proxyEndpoint);
    const requestConfig = {
      agent,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    return timer(schedule.initialDelayMs, delayMs).pipe(
      switchMap(() => {
        const requestUrl = new URL(endpoint);
        requestUrl.searchParams.append('path', folderPath);
        requestUrl.searchParams.append('type', 'folder');
        requestUrl.searchParams.append('multi', 'arrayBased');

        const request = new Request(requestUrl, requestConfig);
        return fromHttpRequest<Page[]>(request).pipe(
          map(response =>
            isErrorResponse<Page[]>(response)
              ? []
              : mapContentFragmentToComponentDescriptor(
                  response,
                  fragmentUrl,
                  prefixDir,
                  proxyEndpoint
                )
          )
        );
      })
    );
  }
};

export default AemSource;
