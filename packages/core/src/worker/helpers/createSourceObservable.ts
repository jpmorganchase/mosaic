import { escapeRegExp } from 'lodash';
import path from 'path';
import type { Observable } from 'rxjs';
import { isObservable, map } from 'rxjs';

import type { Page, Source, WorkerData } from '@jpmorganchase/mosaic-types';

export default async function createSourceObservable(
  { modulePath, options, pageExtensions, ignorePages }: WorkerData,
  serialiser
): Promise<Observable<Page[]>> {
  const api = await getSourceDefinitionExports(modulePath);
  const source$ = api.create(options, { serialiser, pageExtensions });

  if (!isObservable(source$)) {
    throw new Error(`Source at '${modulePath}' did not return an Observable.`);
  }
  const isNonHiddenPage = createPageTest(ignorePages, pageExtensions);

  // TODO: Move this formatter
  return source$.pipe(
    map((pages: Page[]) => {
      return pages.reduce((pages, page) => {
        if (!isNonHiddenPage(page.fullPath)) {
          console.warn(
            `File '${
              page.fullPath
            }' does not have a matching page file extension, it will be removed from the output.
            
NOTE: Only ${pageExtensions.join(
              ', '
            )} extensions are supported (as per the value defined in PullDocs config \`pageExtensions\`). To add non-page files to the filesystem, start their names with a dot to indicate they are hidden files.`
          );
          return pages;
        }
        if (!page.fullPath) {
          console.warn(
            `Page '${page.fullPath}' is missing the \`fullPath\` property. It will be removed from the output.`
          );
          return pages;
        }

        return pages.concat({
          ...page,
          title: page.title || page.fullPath,
          fullPath: page.fullPath.toLowerCase(),
          route: page.route ? page.route.toLowerCase() : page.fullPath.toLowerCase()
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

function createPageTest(ignorePages, pageExtensions) {
  const extTest = new RegExp(`${pageExtensions.map(escapeRegExp).join('|')}$`);
  const ignoreTest = new RegExp(`${ignorePages.map(escapeRegExp).join('|')}$`);
  return file => {
    return !ignoreTest.test(file) && extTest.test(file) && !path.basename(file).startsWith('.');
  };
}
