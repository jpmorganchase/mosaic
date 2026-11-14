---
'@jpmorganchase/mosaic-plugins': patch
'@jpmorganchase/mosaic-site-middleware': patch
'@jpmorganchase/mosaic-cli': patch
---

Resolve `{meta.*}` tokens anywhere in table-of-contents headings, and give those headings matching ids

`TableOfContentsPlugin` only resolved a heading that was a single
`{meta.*}` token, threw when the token didn't resolve, and ran before
`$RefPlugin` resolved `$ref`s. It now replaces every token in a heading,
keeps tokens that don't resolve as they are, and rebuilds the table of
contents in `$beforeSend` for pages whose tokens need `$ref` values. The
default config runs it at priority `-1.5`, between `$RefPlugin` and
`LazyPagePlugin`.

`serializeMdxForClient` resolves the same tokens before `rehype-slug`, so
a heading such as `## Examples for {meta.title}` gets the id the table of
contents links to instead of `examples-for-`. Repeated headings are now
numbered the same way in both.
