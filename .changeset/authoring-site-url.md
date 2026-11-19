---
'@jpmorganchase/mosaic-content-editor-plugin': minor
'@jpmorganchase/mosaic-site-components': minor
---

Edit a site's pages in one environment. An edit raises a pull request against the branch the environment reads, so editing on test went straight to its branch and skipped dev. The new `AuthoringSiteProvider` (from `@jpmorganchase/mosaic-content-editor-plugin/authoringSite`) sets the site where pages are edited; the header's Edit and New Page controls then open the same page there, and show without signing in here. The reference site sets it from the new `MOSAIC_AUTHORING_URL`, redirects `?edit=1` and `?new=1` requests there, and refuses to preview or save.
