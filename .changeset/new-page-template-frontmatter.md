---
'@jpmorganchase/mosaic-content-editor-plugin': patch
---

Always send a new page's frontmatter when it is created. The save dialog left frontmatter out of the save when it matched the editor's baseline, so an unchanged page keeps its on-disk bytes. For a new page the baseline is the host's template, which already has the title from the New Page dialog, so an author who didn't edit the Frontmatter tab saved without frontmatter, and the Git workflows refused to create the page ("a new page requires authored frontmatter"). New pages now always send it; saves of existing pages are unchanged.
