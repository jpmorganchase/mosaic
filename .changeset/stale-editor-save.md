---
'@jpmorganchase/mosaic-cli': patch
'@jpmorganchase/mosaic-content-editor-plugin': patch
'@jpmorganchase/mosaic-site-middleware': patch
'@jpmorganchase/mosaic-types': patch
'@jpmorganchase/mosaic-workflows': patch
---

Reject saves when the source file has changed since the author opened the editor. Keep the author's draft available after reporting the conflict so they can apply their changes to the latest version.
