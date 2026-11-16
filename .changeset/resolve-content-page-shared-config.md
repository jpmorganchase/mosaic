---
'@jpmorganchase/mosaic-site-middleware': patch
---

`resolveContent` now returns the shared config a page renders with: its folder's config with the page's own authored `sharedConfig` on top. `sourceCapabilities` always comes from the folder, so content can't grant itself capabilities such as editing. `mdx.frontmatter.sharedConfig` holds the same merged value, so hosts no longer need to merge them. `mergePageSharedConfig` is exported for hosts that resolve content themselves.
