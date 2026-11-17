---
'@jpmorganchase/mosaic-plugins': patch
'@jpmorganchase/mosaic-site-middleware': patch
---

Keep table-of-contents and search anchors aligned with rendered MDX headings.
Resolve actual `meta` expressions while preserving inline code and escaped text,
omit other expressions from heading ids, and rebuild duplicate-heading ids when
references in headings outside the displayed TOC range resolve.

Search every frontmatter field configured with `records.fields`. Custom fields
rank alongside body text, while `description` and `keywords` keep their existing
ranking. Custom fields also provide a snippet when the page has no body text or
description.
