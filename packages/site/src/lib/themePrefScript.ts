import { colorModeScript } from '@jpmorganchase/mosaic-store/theme-preference';

/**
 * Theme-mode script that sets `data-mode` on `<html>` from
 * `localStorage` before first paint, preventing a dark-mode FOUC. The
 * root layout renders it as a plain inline `<script>` in the `<head>`,
 * so the browser runs it while parsing the server HTML, before React
 * hydrates. React never executes scripts it renders on the client, which
 * is fine: the root layout's `<head>` is only rendered on full page
 * loads, which is all this script needs.
 *
 * First-time visitors have nothing stored, and storage can be blocked or
 * hold a malformed value. All of those fall back to the store's default
 * mode, `light`, rather than leaving `data-mode` unset until hydration.
 *
 * It also sets Salt's density class, which `ThemeProvider` would otherwise
 * add after hydration. The server supplies a low-density light theme for
 * browsers where JavaScript is disabled; replace that density before paint.
 * Density is `touch` below Salt's `md` breakpoint (960px) and `low` from it,
 * as in `ThemeProvider`.
 */
export const themePrefScript = `${colorModeScript}
  (function () {
    var wide = window.matchMedia && window.matchMedia("(min-width: 960px)").matches;
    document.documentElement.classList.remove("salt-density-low", "salt-density-touch");
    document.documentElement.classList.add(wide ? "salt-density-low" : "salt-density-touch");
  })();
`;
