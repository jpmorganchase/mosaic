---
'@jpmorganchase/mosaic-site-middleware': patch
---

Stop Turbopack tracing a whole site into its server output because of snapshot JSON reads. The snapshot path comes from `MOSAIC_SNAPSHOT_DIR`, so the read is now marked with `turbopackIgnore`; include your snapshots with `outputFileTracingIncludes`, as the Vercel publishing guide describes.
