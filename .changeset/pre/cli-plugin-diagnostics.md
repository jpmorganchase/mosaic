---
'@jpmorganchase/mosaic-cli': patch
'@jpmorganchase/mosaic-core': patch
'@jpmorganchase/mosaic-plugins': patch
---

Clearer CLI and plugin diagnostics

- `mosaic serve` now prints why it couldn't listen, with the host and
  port, instead of exiting silently through the disabled Fastify logger.
- `FragmentPlugin` keeps expanding fragments after a page it can't parse,
  then reports every failing page in one error. Previously the first bad
  page stopped fragments expanding in every page after it. Its warnings
  also name the page that contains the bad directive.
- The core plugin runner names the page when a plugin error carries one.
- The Sidebar warning says why a folder has no grouping: it has no pages,
  its pages are all in subfolders, or every page directly in it sets
  `sidebar.exclude: true`.
