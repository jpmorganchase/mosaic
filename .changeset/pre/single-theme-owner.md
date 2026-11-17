---
'@jpmorganchase/mosaic-store': minor
'@jpmorganchase/mosaic-components': minor
'@jpmorganchase/mosaic-site-components': minor
---

Move colour mode into a root `ColorModeProvider`, independent of page and header content stores. This removes cross-store broadcasting, per-store storage listeners and content-store registration/disposal.

Migration: wrap `ThemeProvider` and all theme consumers with one `ColorModeProvider` from `@jpmorganchase/mosaic-store`. Keep using `useColorMode()` and `useStoreActions().setColorMode()`. Replace direct `SiteState.colorMode`/`actions` selectors with those hooks, and remove `registerStore`/`disposeStore` calls. Content stores now contain only document data. The existing saved preference format and cross-tab updates are preserved.
