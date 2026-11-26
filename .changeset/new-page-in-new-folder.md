---
'@jpmorganchase/mosaic-site-middleware': patch
---

Let authors create a page in a new folder. `NewPageDialog` offers new folders and the save workflows create them, but `resolveContent` only read the shared config of the missing page's own folder. A folder that doesn't exist yet has none, so the create-page flow (`?new=1`) found no `sourceCapabilities` and answered 404. For a missing page whose folder has no shared config, `resolveContent` now returns the config of the nearest folder above it, which belongs to the source that will own the page. It reads at most `MAX_NEW_FOLDER_DEPTH` (10) folders up, and only when the page's own folder has no config, so other misses cost nothing extra.
