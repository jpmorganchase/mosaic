---
'@jpmorganchase/mosaic-core': patch
'@jpmorganchase/mosaic-cli': patch
---

Keep namespace-scoped content reads aligned with the live source mount order when
sources stop or are replaced. Scoped servers now serve the same source selected
for raw editor reads, save defaults, and workflow writes after lifecycle changes.
Raw reads of unpublished sidecar files also use the current registered sources.
