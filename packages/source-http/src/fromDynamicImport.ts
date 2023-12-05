import type { Page } from '@jpmorganchase/mosaic-types';
import { distinctUntilChanged, from, switchMap } from 'rxjs';

export type ResponseTransformer<TResponse, TPage> = (
  response: TResponse,
  prefixDir: string,
  index: number,
  ...rest: any[]
) => Array<TPage>;

async function importTransformer<TResponse, TPage>(
  modulePath: string
): Promise<{
  transformer: ResponseTransformer<TResponse, TPage>;
}> {
  const { default: transformResponseToPages } = await import(modulePath);
  if (!transformResponseToPages) {
    throw new Error(`[Mosaic] '${modulePath}' did not have a default export.`);
  }

  return { transformer: transformResponseToPages };
}

export const fromDynamicImport = <TResponse = unknown, TPage = Page>(modulePath: string) =>
  from(modulePath).pipe(
    distinctUntilChanged(),
    switchMap(() => importTransformer<TResponse, TPage>(modulePath))
  );
