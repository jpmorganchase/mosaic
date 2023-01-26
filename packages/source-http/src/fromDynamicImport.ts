import type { Page } from '@jpmorganchase/mosaic-types';
import { from } from 'rxjs';

export type ResponseTransformer = (...args: unknown[]) => Page[];

let transformer: ResponseTransformer | null = null;

async function importTransformer(modulePath: string): Promise<ResponseTransformer> {
  if (transformer !== null) {
    return transformer;
  }

  const { default: transformResponseToPages } = await import(modulePath);
  if (!transformResponseToPages) {
    throw new Error(`[Mosaic] '${modulePath}' did not have a default export.`);
  }
  transformer = transformResponseToPages;
  return transformResponseToPages;
}

export const fromDynamicImport = (modulePath: string) => from(importTransformer(modulePath));
