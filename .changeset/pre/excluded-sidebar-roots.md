---
'@jpmorganchase/mosaic-plugins': patch
---

Keep excluded sidebar index pages as structural metadata so visible descendants still receive navigation. Exclusion hides the page link while preserving group labels, priorities, and sort configuration. Prune empty groups, produce an empty sidebar safely when every page is excluded, and sort descendants through single-child groups. Previous/next navigation includes only visible pages.
