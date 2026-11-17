---
'@jpmorganchase/mosaic-components': patch
---

Render readable escaped code before syntax highlighting, avoid loading Shiki for
plain text fences, and retain plain code when a grammar or highlighter cannot be
loaded. Refreshed snippets no longer display stale highlighted content.
