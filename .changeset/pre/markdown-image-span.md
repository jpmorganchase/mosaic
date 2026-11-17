---
'@jpmorganchase/mosaic-site-components': patch
---

Wrap images in a block-level `<span>` instead of a `<div>`

Markdown images always sit inside a paragraph, and the markdown `img`
mapping renders `Image`. Its `<div>` wrapper was invalid inside a `<p>`:
the browser closed the paragraph early and React reported a hydration
error. The wrapper is now a `<span>` styled `display: block`, so layout is
unchanged.
