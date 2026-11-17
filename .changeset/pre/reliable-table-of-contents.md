---
'@jpmorganchase/mosaic-site-components': patch
'@jpmorganchase/mosaic-layouts': patch
---

Keep table-of-contents selection aligned with the current section, including zero
positions, missing headings and page changes with the same number of headings.
Measure document coordinates after content changes, apply the header offset once,
and respect reduced-motion preferences when following section links. Native heading
links in Mosaic layouts also clear the sticky header before hydration.
