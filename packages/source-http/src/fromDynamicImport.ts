import type { Page } from '@jpmorganchase/mosaic-types';
import { from } from 'rxjs';

export type ResponseTransformer = (...args: unknown[]) => Page[];

let transformer: { transformer: ResponseTransformer; requestConfig?: RequestInit };

async function importTransformer(modulePath: string): Promise<typeof transformer> {
  if (transformer !== undefined) {
    return transformer;
  }

  const { default: transformResponseToPages, requestConfig } = await import(modulePath);
  if (!transformResponseToPages) {
    throw new Error(`[Mosaic] '${modulePath}' did not have a default export.`);
  }
  transformer = { transformer: transformResponseToPages, requestConfig };
  return transformer;
}

export const fromDynamicImport = (modulePath: string) => from(importTransformer(modulePath));
