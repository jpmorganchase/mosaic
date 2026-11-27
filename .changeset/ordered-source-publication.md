---
'@jpmorganchase/mosaic-core': patch
---

Process source generations in order, keeping each generation's configuration, pages, and aliases together. Restore cached pages when an active source starts while waiting for the first live update.

Apply namespace hooks in order with the affected source's updates. Honor the source's cache setting and fall back to live updates when cached pages cannot be restored.
