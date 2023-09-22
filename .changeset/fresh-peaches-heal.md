---
'@jpmorganchase/mosaic-content-editor-plugin': patch
---

### Fix

The insert/edit link dialog no longer closes when its contents are clicked.

### Refactor

The forms used to insert/edit links and insert images in the content editor plugin have been updated to use the latest version of `FormField` and `Input` from Salt-ds.
