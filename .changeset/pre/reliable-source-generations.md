---
'@jpmorganchase/mosaic-core': patch
'@jpmorganchase/mosaic-plugins': patch
'@jpmorganchase/mosaic-cli': patch
'@jpmorganchase/mosaic-site-components': patch
---

Keep each source generation's pages and configuration together during publication, propagate failed file reads and permit retry, and start workers when parent memory settings are configured. Correct default page filtering and shared-config ancestry so sibling or unrelated folders do not inherit settings. Resolve raw editor reads from the scoped content owner and support search configurations with match metadata disabled.
