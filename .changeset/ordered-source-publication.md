---
'@jpmorganchase/mosaic-core': patch
---

Process source generations in order, keeping each generation's configuration, pages, and aliases together. Restore cached pages when an active source starts while waiting for the first live update.

Keep namespace hooks and shared artifact writes in publication order. Honor the source's cache setting and fall back to live updates when cached pages cannot be restored.
