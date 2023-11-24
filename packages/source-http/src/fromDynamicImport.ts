import { distinctUntilChanged, from, iif, of, switchMap } from 'rxjs';

export type ResponseTransformer<TResponse, TOptions> = (
  response: TResponse,
  prefixDir: string,
  index: number,
  options?: TOptions
) => Array<TResponse>;

async function importTransformer<T, O>(
  modulePath: string
): Promise<{
  transformer: ResponseTransformer<T, O>;
}> {
  const { default: transformResponseToPages } = await import(modulePath);
  if (!transformResponseToPages) {
    throw new Error(`[Mosaic] '${modulePath}' did not have a default export.`);
  }

  return { transformer: transformResponseToPages };
}

export const fromDynamicImport = <TResponse = unknown, TOptions = unknown>(modulePath?: string) =>
  iif(
    () => modulePath === undefined,
    of({ transformer: null }),
    from(String(modulePath)).pipe(
      distinctUntilChanged(),
      switchMap(() => importTransformer<TResponse, TOptions>(String(modulePath)))
    )
  );
