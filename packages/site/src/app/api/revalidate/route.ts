import { createRevalidateHandler } from '@jpmorganchase/mosaic-site-middleware/revalidate';
import { getSiteConfig } from '../../../lib/config';
import { notifyContentChanged } from '../../../lib/liveReloadBus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Static export replaces this adapter with a stub. Environment/placeholder policy stays in the host.
export const POST = createRevalidateHandler({
  getSecret: () => {
    const { secret, secretIsPlaceholder } = getSiteConfig().revalidate;
    return {
      secret,
      ...(secretIsPlaceholder && {
        unavailableMessage:
          'MOSAIC_REVALIDATE_SECRET is the development placeholder; configure a real secret.'
      })
    };
  },
  notify: notifyContentChanged
});
