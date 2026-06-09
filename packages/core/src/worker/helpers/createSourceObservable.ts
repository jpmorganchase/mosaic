import { isObservable, map, catchError, throwError } from 'rxjs';
import type { Observable } from 'rxjs';
import path from 'path';
import { escapeRegExp } from 'lodash-es';
import type { Page, Source, WorkerData } from '@jpmorganchase/mosaic-types';

import { exponentialBackOffRetryStrategy } from './exponentialBackOffRetryStrategy.js';

async function getSourceDefinitionExports(modulePath): Promise<Source> {
  const { default: defaultProp }: { default: Source | { __esModule: boolean; default: Source } } =
    await import(modulePath);

  const api =
    'default' in defaultProp && defaultProp.__esModule
      ? defaultProp.default
      : (defaultProp as Source);

  if (!api) {
    throw new Error(`Could not resolve source '${modulePath}'.`);
  }

  if (typeof api.create !== 'function') {
    throw new Error(`Source '${modulePath}' does not have a valid \`create\` function.`);
  }

  return api;
}

function createPageTest(ignorePages, pageExtensions) {
  const extTest = new RegExp(`${pageExtensions.map(escapeRegExp).join('|')}$`);
  const ignoreTest = new RegExp(`${ignorePages.map(escapeRegExp).join('|')}$`);
  return file =>
    !ignoreTest.test(file) && extTest.test(file) && !path.basename(file).startsWith('.');
}

export default async function createSourceObservable(
  { modulePath, name, options, pageExtensions, ignorePages, schedule }: WorkerData,
  serialiser
): Promise<Observable<Page[]>> {
  const api = await getSourceDefinitionExports(modulePath);
  const source$ = api.create(options, { serialiser, pageExtensions, schedule });

  if (!isObservable(source$)) {
    throw new Error(`Source at '${modulePath}' did not return an Observable.`);
  }
  const isNonHiddenPage = createPageTest(ignorePages, pageExtensions);

  // Snapshot the source's static capability declaration once at
  // load time. Only stamp pages when the source actually declared
  // at least one capability — sources that opted into nothing should
  // not pay the cost of an extra (and downstream-meaningful) field
  // on every emitted page, and downstream plugins use truthiness of
  // `page.sourceCapabilities` as their "is there anything to do?"
  // signal.
  const declaredCapabilities = api.capabilities;
  const hasCapabilities =
    declaredCapabilities != null && Object.keys(declaredCapabilities).length > 0;
  const sourceCapabilities = hasCapabilities ? declaredCapabilities : undefined;

  // TODO: Move this formatter
  return source$.pipe(
    map((pages: Page[]) =>
      pages.reduce((pagesResult, page) => {
        if (!isNonHiddenPage(page.fullPath)) {
          console.warn(
            `[Mosaic][Core] File '${
              page.fullPath
            }' does not have a matching page file extension, it will be removed from the output.
            
NOTE: Only ${pageExtensions.join(
              ', '
            )} extensions are supported (as per the value defined in Mosaic Core config \`pageExtensions\`). To add non-page files to the filesystem, start their names with a dot to indicate they are hidden files.`
          );
          return pagesResult;
        }
        if (!page.fullPath) {
          console.warn(
            `[Mosaic][Core] Page '${page.fullPath}' is missing the \`fullPath\` property. It will be removed from the output.`
          );
          return pagesResult;
        }

        const stamped: Page = {
          ...page,
          title: page.title || page.fullPath,
          fullPath: page.fullPath.toLowerCase(),
          route: page.route ? page.route.toLowerCase() : page.fullPath.toLowerCase()
        };
        if (sourceCapabilities) {
          stamped.sourceCapabilities = sourceCapabilities;
        }
        return pagesResult.concat(stamped);
      }, [])
    ),
    exponentialBackOffRetryStrategy({ ...schedule, name }),
    catchError(error => {
      console.log(
        `[Mosaic][Core] Source ${name} failed and retries are ${
          schedule.retryEnabled ? 'exhausted' : 'disabled'
        }`
      );
      return throwError(() => error);
    })
  );
}
