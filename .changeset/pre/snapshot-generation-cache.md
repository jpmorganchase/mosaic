---
'@jpmorganchase/mosaic-cli': patch
'@jpmorganchase/mosaic-site-middleware': patch
---

Key persistent snapshot loader caches by the resolved snapshot root and a published generation ID, preventing MDX and shared configuration from surviving a snapshot change under the same directory name. The CLI writes reserved `mosaic-snapshot.json` metadata after content and aliases are complete. Legacy snapshots without valid metadata remain readable and bypass persistent caching while retaining request memoization.
