import { SiteState } from '@jpmorganchase/mosaic-loaders';
import { compile, type CompileOptions } from './compile';
import { mdxComponents } from '../mdx';

export type PreviewActionOptions = {
  source: string;
  data?: Partial<SiteState>;
  components?: CompileOptions['components'];
};

/**
 *
 * This is a wrapper around the compile function that handles errors.
 *
 * When previewing content in the editor we expect errors
 * so want to show them in toasts and not redirect to the main error page
 */
export async function preview({
  components = mdxComponents,
  ...restOptions
}: PreviewActionOptions) {
  try {
    const result = await compile({ ...restOptions, components });
    return { result };
  } catch (e) {
    if (e instanceof Error) {
      return {
        result: undefined,
        error: e.message
      };
    }

    throw e;
  }
}

export type PreviewAction = typeof preview;
