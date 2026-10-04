import type { SharedConfig } from '@jpmorganchase/mosaic-store';

/**
 * Dev-only escape hatch for the source-capability gate.
 *
 * The gate (see the edit/create branch in
 * `app/[namespace]/[section]/[[...route]]/page.tsx`) hides the editor on pages whose
 * owning source has not declared `capabilities.writable = true`. In this
 * repo's own dev environment the docs are served via
 * `source-local-folder`, which is correctly non-writable — which would
 * also lock out the editor's own e2e tests (and any hand-iteration
 * against local content).
 *
 * Setting `MOSAIC_DEV_BYPASS_CAPABILITY_GATE=true` makes every page
 * present as if it were from a writable source. The bypass is
 * hard-guarded against production: `NODE_ENV` must not be
 * `production`, and a boot-time warning fires so the leak is impossible
 * to miss.
 *
 * The bypass rewrites the shared config to force
 * `sourceCapabilities.writable = true` on the server, so the client-side
 * `useSourceCapabilities()` hook sees the same (overridden) snapshot
 * without any parallel env-var coordination.
 */
export const CAPABILITY_GATE_BYPASSED =
  process.env.NODE_ENV !== 'production' && process.env.MOSAIC_DEV_BYPASS_CAPABILITY_GATE === 'true';

if (CAPABILITY_GATE_BYPASSED) {
  console.warn(
    '[mosaic-site] MOSAIC_DEV_BYPASS_CAPABILITY_GATE is enabled — ' +
      'the editor is mounted on every page regardless of source ' +
      'writability. Do NOT enable this in production.'
  );
}

/**
 * Applies the dev bypass to a shared config: a shallow merge that keeps
 * authored fields (header, footer, …) and forces `writable: true`.
 * Returns the config untouched when the bypass is off.
 */
export function withCapabilityBypass(
  sharedConfig: SharedConfig | undefined
): SharedConfig | undefined {
  if (!CAPABILITY_GATE_BYPASSED) return sharedConfig;
  return {
    ...(sharedConfig ?? {}),
    sourceCapabilities: {
      ...(sharedConfig?.sourceCapabilities ?? {}),
      writable: true
    }
  } as SharedConfig;
}
