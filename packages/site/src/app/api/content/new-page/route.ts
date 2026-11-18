/**
 * Whether new pages can be created in a folder:
 * `GET /api/content/new-page?folder=…`. The editor's New Page dialog asks
 * before it opens the new page. See `createNewPageHandler`.
 *
 * It applies the same dev capability bypass as the catch-all page, so the
 * dialog and the page agree. Static-export builds replace this file with
 * a stub via `scripts/static-export-route-stubs.mjs`.
 */
import { createNewPageHandler } from '@jpmorganchase/mosaic-site-middleware';

import { withCapabilityBypass } from '../../../../lib/capabilities';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = createNewPageHandler({ transformSharedConfig: withCapabilityBypass });
