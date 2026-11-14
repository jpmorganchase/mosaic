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
 */
export const themePrefScript = `
  (function () {
    var theme = "light";
    try {
      var stored = JSON.parse(localStorage.getItem("mosaic-theme-pref"));
      theme = (stored && stored.state && stored.state.colorMode) || theme;
    } catch (e) { /* storage unavailable or malformed */ }
    document.documentElement.setAttribute("data-mode", theme);
  })();
`;
