import { isObservable, map } from 'rxjs';
import type { Observable } from 'rxjs';

import type WorkerData from '@pull-docs/types/dist/WorkerData';
import type Source from '@pull-docs/types/dist/Source';
import type Page from '@pull-docs/types/dist/Page';
import { escapeRegExp } from 'lodash';

export default async function createSourceObservable(
  { modulePath, options, pageExtensions }: WorkerData,
  serialiser
): Promise<Observable<Page[]>> {
  const api = await getSourceDefinitionExports(modulePath);
  const source$ = api.create(options, { serialiser, pageExtensions });

  if (!isObservable(source$)) {
    throw new Error(`Source at '${modulePath}' did not return an Observable.`);
  }
  const pageTest = new RegExp(`${pageExtensions.map(escapeRegExp).join('|')}$`);

  // TODO: Move this formatter
  return source$.pipe(
    map((pages: Page[]) => {
      return pages.reduce((pages, page) => {
        if (!pageTest.test(page.route)) {
          console.warn(
            `File '${
              page.route
            }' does not have a matching page file extension, it will be removed from the output.
            
NOTE: Only ${pageExtensions.join(
              ', '
            )} extensions are supported (as per the defined PullDocs config). To add non-page files to the filesystem, do this in \`$beforeSend\`, not \`$afterSource\`.`
          );
          return pages;
        }
        if (!page.route) {
          console.warn(
            `Page '${page.route}' is missing the \`route\` property. It will be removed from the output.`
          );
          return pages;
        }

        return pages.concat({
          ...page,
          title: page.title || page.route,
          route: page.route.toLowerCase(),
          friendlyRoute: page.friendlyRoute
            ? page.friendlyRoute.toLowerCase()
            : page.route.toLowerCase()
        });
      }, []);
    })
  );
}

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
