---
'@jpmorganchase/mosaic-site-middleware': patch
'@jpmorganchase/mosaic-content-editor-plugin': patch
---

Let authors create a page in a folder that doesn't exist yet, and stop the New Page dialog sending them to a 404. A missing page now takes the shared config of the nearest folder above it when its own folder has none, so `?new=1` in a new folder of a writable source opens the editor. The new `createNewPageHandler` (mounted at `/api/content/new-page`) answers whether a folder can take new pages, and the dialog keeps Create disabled, with a message, for a folder outside every writable source. Sites without the route keep the old behaviour.
