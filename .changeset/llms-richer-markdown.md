---
'@jpmorganchase/mosaic-plugins': patch
'@jpmorganchase/mosaic-site-middleware': patch
---

Give agents more to work with in each page's Markdown.

- `LlmsTxtPlugin` adds `lastModified` to the frontmatter when the page's source knows it, and copies the frontmatter fields named in the new `frontmatterFields` option, such as `version` or `tags`.
- With `siteUrl`, links and images in the page body include the site's origin, as the links in `llms.txt` already do.
- `createLlmsHandler` adds `rel="canonical"` for the HTML page to each Markdown response's `Link` header.
