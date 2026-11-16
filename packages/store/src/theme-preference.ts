import type { ColorMode } from './types/colorMode';

/** Shared with the pre-hydration script; keep the persisted format compatible. */
export const STORAGE_KEY = 'mosaic-theme-pref';

export function parseColorModePreference(value: string | null): ColorMode | undefined {
  try {
    const mode = value && JSON.parse(value)?.state?.colorMode;
    return mode === 'light' || mode === 'dark' ? mode : undefined;
  } catch {
    return undefined;
  }
}

export function serializeColorModePreference(colorMode: ColorMode): string {
  return JSON.stringify({ state: { colorMode }, version: 0 });
}

/**
 * Server-safe inline script. Keep its validation aligned with the parser above.
 * Do not stringify the function: transforms can insert references to their own
 * runtime helpers, which are unavailable in this isolated script.
 * Density and other host preferences remain host-owned.
 */
export const colorModeScript = `
  (function () {
    var mode = "light";
    try {
      var stored = JSON.parse(localStorage.getItem(${JSON.stringify(
        STORAGE_KEY
      )}))?.state?.colorMode;
      if (stored === "light" || stored === "dark") mode = stored;
    } catch (e) { /* storage unavailable */ }
    document.documentElement.setAttribute("data-mode", mode);
  })();
`;
