---
'@jpmorganchase/mosaic-components': patch
---

Render headings in `FormattedContent` without a "Copy link to heading" link, and render links in `EditionFilterView` tile descriptions as their text. The headings have no ids, so their copy links pointed to `#undefined`, and each tile is itself a link, so these links were nested inside it, which is invalid HTML and broke hydration. `FormattedContent` now accepts an `a` override in `components`.
