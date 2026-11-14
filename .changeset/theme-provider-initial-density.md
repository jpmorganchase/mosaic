---
'@jpmorganchase/mosaic-components': patch
---

Start `ThemeProvider` at the density for the viewport

`ThemeProvider` started at Salt's `low` density and switched to `touch` on
narrow viewports after hydration. It now starts at the viewport's density, as
the reference site's inline theme script sets it before the first paint, so
Salt doesn't swap density classes straight after hydration.
