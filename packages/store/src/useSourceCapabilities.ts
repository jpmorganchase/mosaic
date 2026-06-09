import type { SourceCapabilities } from '@jpmorganchase/mosaic-types';

import { useStore } from './store';

/**
 * Capability flags of the source that owns the currently rendered
 * route. Surfaced via the per-route shared config that
 * `SharedConfigPlugin` writes from each source module's
 * `capabilities` export.
 *
 * Returns an empty object when no source has declared any flags,
 * so callers can destructure safely without null-guards.
 */
export function useSourceCapabilities(): SourceCapabilities {
  return useStore(state => state.sharedConfig?.sourceCapabilities) ?? {};
}
