---
'@jpmorganchase/mosaic-content-editor-plugin': patch
---

Mount editor inputs only after the initial splitter layout is ready, preventing
early body or frontmatter edits from being erased by a layout remount.
