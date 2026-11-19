---
'@jpmorganchase/mosaic-content-editor-plugin': patch
---

Keep nested lists when editing a page. The editor used Lexical 0.45, whose Markdown import only nested a list item indented by four spaces, so the two-space sublists Prettier and CommonMark write (three spaces under `1. `) were flattened into top-level items, and saving the page rewrote its structure. Lexical 0.50 nests by the parent item's content column, as CommonMark does, and reads a blank line between list items as a loose list instead of the end of the list.
