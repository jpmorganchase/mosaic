/**
 * The sidebar tree shared by every page of a section (`/mosaic/configure`).
 *
 * `SidebarPlugin` publishes one `sidebar.json` per sidebar root folder
 * (`rootDirGlob` in `mosaic.config.mjs`; two levels deep here, i.e.
 * sections). The section layout sends the tree once, and pages whose
 * `sidebarData` is the same tree leave their copy out. Falls back to a
 * namespace-level tree for sites whose sidebar roots are namespaces; deeper
 * roots get no shared tree and their pages simply keep their own copy.
 *
 * `cache()`-wrapped so the layout and the page share one lookup per request.
 */
import { cache } from 'react';
import type { MosaicMode } from '@jpmorganchase/mosaic-types';
import { getSidebarData } from '@jpmorganchase/mosaic-site-middleware';

export const getSectionSidebar = cache(
  async (namespace: string, section: string, mode: MosaicMode, contentUrl: string) =>
    (await getSidebarData(`/${namespace}/${section}`, mode, contentUrl).catch(() => undefined)) ??
    (await getSidebarData(`/${namespace}`, mode, contentUrl).catch(() => undefined))
);
