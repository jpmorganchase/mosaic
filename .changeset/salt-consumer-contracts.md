---
'@jpmorganchase/mosaic-cli': patch
'@jpmorganchase/mosaic-core': patch
'@jpmorganchase/mosaic-types': patch
'@jpmorganchase/mosaic-site-components': minor
'@jpmorganchase/mosaic-plugins': minor
---

Fail snapshot builds before writing content or a generation identity when plugins record errors, preserving source, plugin, lifecycle and original diagnostics across worker boundaries.

Fix portable SearchProvider declarations and expose browser index policies and browser/server query limits. Export the typed search context for custom controls.

Include the dependencies referenced by public Mosaic types in the published manifest, including the glob declaration types needed by strict external consumers.

Export the sidebar tree builder with sorting and page/group metadata hooks, allowing consumers to own persistence without copying traversal. Preserve nested groups, independent group priorities and status badges.
