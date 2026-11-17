---
'@jpmorganchase/mosaic-components': patch
---

Use shiki 4, the version `mosaic-site-middleware` highlights code blocks with, so hosts install one shiki instead of two. `Pre` only loads shiki in the browser when a code block has no server-highlighted HTML, and its output is the same as with shiki 3.
