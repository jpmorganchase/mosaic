---
'@jpmorganchase/mosaic-components': patch
---

Hydrate density-dependent components consistently

`ThemeProvider` uses the same initial density on the server and during
hydration, then applies the viewport's density and follows breakpoint changes.
This keeps nested Salt providers and density-dependent SVGs consistent with
their server-rendered markup, including on narrow screens. The reference
site's inline theme script still sets the root density class before first paint.
