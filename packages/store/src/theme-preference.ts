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

/** Server-safe inline script. Density and other host preferences remain host-owned. */
export const colorModeScript = `
  (function () {
    var mode = "light";
    try {
      mode = (${parseColorModePreference.toString()})(localStorage.getItem(${JSON.stringify(
  STORAGE_KEY
)})) || mode;
    } catch (e) { /* storage unavailable */ }
    document.documentElement.setAttribute("data-mode", mode);
  })();
`;
