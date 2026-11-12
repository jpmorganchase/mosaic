---
'@jpmorganchase/mosaic-plugins': patch
---

Join sitemap entries from multiple sources without inserting commas into the XML urlset. Empty source batches now leave only whitespace between URL elements.

Add optional sitemap-only `exclude` glob patterns so internal data records can remain available to other plugins without creating broken public sitemap URLs.
