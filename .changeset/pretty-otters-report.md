---
'@jpmorganchase/mosaic-plugins': patch
---

added `remark-mdx` to `DocumentAssetsPlugin`

when parsing JSX, it was escaping JSX elements it considered un-safe, because it thought they were html
