---
'@jpmorganchase/mosaic-content-editor-plugin': patch
---

Seed editable bodies from authored source so saves preserve fragment directives and other source content. Require raw source for saving existing pages, retain complete frontmatter drafts across editor modes, and prevent saving invalid metadata edits. Clear leave warnings after successful saves while retaining protection for edits made during a save, and allow create-page mode switches without prompting.
