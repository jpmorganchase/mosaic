import { SiteState } from '@jpmorganchase/mosaic-loaders';
import { compile } from './compile';

/**
 *
 * This is a wrapper around the compile function that handles errors.
 *
 * When previewing content in the editor we expect errors
 * so want to show them in toasts and not redirect to the main error page
 */
export async function preview({
  source,
  data = {}
}: {
  source: string;
  data?: Partial<SiteState>;
}) {
  try {
    const result = await compile({ source, data });
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
