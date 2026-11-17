---
'@jpmorganchase/mosaic-plugins': patch
'@jpmorganchase/mosaic-site-middleware': patch
'@jpmorganchase/mosaic-types': patch
'@jpmorganchase/mosaic-cli': patch
---

Serve the docs as Markdown for agents

The new `LlmsTxtPlugin`, in the default config, writes `llms.txt` (an index
of the pages), `llms-full.txt` (every page in one file) and
`markdown-pages.json` (each page as Markdown, with frontmatter). MDX is
converted to plain Markdown: `{meta.*}` expressions are resolved, `Callout`
becomes a quote, other components are replaced with their children, and
relative links are made absolute. Sites convert their own components with the
`componentsModulePath` option, and leave pages out with `exclude` or
`llms: { exclude: true }` frontmatter.

`createLlmsHandler()` from `@jpmorganchase/mosaic-site-middleware` is a route
handler that serves these files from the snapshot or the active-mode content
server. The reference site serves `/llms.txt`, `/llms-full.txt` and
`/<page>.md`, and a page's own URL to requests that accept `text/markdown`.
