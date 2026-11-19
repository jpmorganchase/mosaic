/**
 * Whether new pages can be created in a folder, for the editor's New Page
 * dialog:
 *
 *   // src/app/api/content/new-page/route.ts
 *   export const GET = createNewPageHandler();
 *
 * `GET /api/content/new-page?folder=/docs/guides` answers
 * `{ folder, writable }`. `writable` is the same check the catch-all page
 * makes for `?new=1`: creation metadata from the CLI's source mounts and
 * save workflows (see `getNewPageSharedConfig`). Older content servers
 * fall back to the nearest shared config. A folder with no writable owner answers `false`, so the
 * dialog can say so before the author is sent to a 404.
 *
 * The answer only helps the dialog. The page still makes its own check,
 * and the CLI refuses to save a page that no writable source owns.
 */
import type { MosaicMode } from '@jpmorganchase/mosaic-types';
import type { SharedConfig } from '@jpmorganchase/mosaic-store';

import { isSafeContentPath } from './canonicalRoute.js';
import { resolveMosaicMode } from './loadSitemap.js';
import { getNewPageSharedConfig } from './resolveContent.js';

export interface NewPageHandlerOptions {
  /** Defaults to `MOSAIC_MODE`. */
  mode?: MosaicMode;
  /** Defaults to the content URL for the mode, such as `MOSAIC_ACTIVE_MODE_URL`. */
  contentUrl?: string;
  /**
   * Changes the folder's shared config before it's checked. Pass the same
   * function the catch-all page applies to `resolved.sharedConfig`, such as
   * the reference site's `withCapabilityBypass`, so both agree.
   */
  transformSharedConfig?: (sharedConfig: SharedConfig | undefined) => SharedConfig | undefined;
}

const noStore = { 'Cache-Control': 'no-store' };

/** `/` or a safe absolute folder path, without a trailing slash. */
function parseFolder(value: string | null): string | undefined {
  if (value === null) return undefined;
  if (value === '/') return value;
  const folder = value.replace(/\/+$/, '');
  return isSafeContentPath(folder) ? folder : undefined;
}

export function createNewPageHandler(options: NewPageHandlerOptions = {}) {
  const { mode: modeOption, contentUrl: contentUrlOption, transformSharedConfig } = options;

  return async function GET(request: Request): Promise<Response> {
    const folder = parseFolder(new URL(request.url).searchParams.get('folder'));
    if (folder === undefined) {
      return Response.json({ error: 'invalid-folder' }, { status: 400, headers: noStore });
    }
    const resolved = resolveMosaicMode();
    const mode = modeOption ?? resolved.mode;
    const contentUrl = contentUrlOption ?? resolved.contentUrl;

    let sharedConfig: SharedConfig | undefined;
    try {
      sharedConfig = await getNewPageSharedConfig(folder, mode, contentUrl);
    } catch (error) {
      console.error(
        `[Mosaic] Couldn't load the shared config for new pages in ${folder}: ${error}`
      );
      return Response.json({ error: 'content-unavailable' }, { status: 503, headers: noStore });
    }
    if (transformSharedConfig) sharedConfig = transformSharedConfig(sharedConfig);
    const writable = sharedConfig?.sourceCapabilities?.writable === true;
    return Response.json({ folder, writable }, { headers: noStore });
  };
}
