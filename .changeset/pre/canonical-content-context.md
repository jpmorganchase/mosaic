---
'@jpmorganchase/mosaic-site-middleware': patch
'@jpmorganchase/mosaic-content-editor-plugin': patch
---

Export `resolveContent` and `canonicalRoute` for App Router documentation hosts. Resolve an alias's shared configuration from its backing document, even when generated MDX has no embedded `sharedConfig`. Keep the public canonical URL separate from `sourcePathname`, so aliases and authored permalinks retain the correct source capabilities, raw-source reads and save target.

The editor now uses an explicit host `route` for save and rename operations while retaining authored public route metadata for preview rendering.
