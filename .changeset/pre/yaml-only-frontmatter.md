---
'@jpmorganchase/mosaic-serialisers': minor
'@jpmorganchase/mosaic-content-editor-plugin': patch
'@jpmorganchase/mosaic-site-middleware': patch
'@jpmorganchase/mosaic-workflows': patch
---

Replace `gray-matter` with YAML-only front matter parsing, exported as `parseFrontmatter` and `stringifyFrontmatter` from `@jpmorganchase/mosaic-serialisers/frontmatter`. `gray-matter` evaluates `---js` front matter, so anyone who could author content could run code wherever it was parsed. Front matter that declares any language other than YAML is now rejected. YAML front matter parses and saves exactly as before.
