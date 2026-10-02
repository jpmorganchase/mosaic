---
'@jpmorganchase/mosaic-from-http-request': minor
'@jpmorganchase/mosaic-source-http': patch
'@jpmorganchase/mosaic-source-readme': patch
'@jpmorganchase/mosaic-source-storybook': patch
'@jpmorganchase/mosaic-core': patch
'@jpmorganchase/mosaic-plugins': patch
'@jpmorganchase/mosaic-cli': patch
'@jpmorganchase/mosaic-components': patch
'@jpmorganchase/mosaic-site': patch
---

Fix request timeouts, background work that failed silently, snapshot cleanup, and editor capability spoofing

- **`requestTimeout` now works** for the HTTP, Readme, Storybook and Figma
  sources. rxjs `fromFetch` replaced the Request's own abort signal, so the
  timeout was ignored and a hung endpoint stalled the source. `fromHttpRequest`
  takes a new `{ timeout }` option. It starts a fresh timer for every request,
  including each scheduled poll, and covers reading the response body.
- **Symlinks are applied before the source update continues.** Core no longer
  starts symlink creation without awaiting it, so `afterUpdate` plugins see
  every alias, and a failure is reported for that source instead of crashing
  the process with an unhandled rejection.
- **`BrokenLinksPlugin`** still checks links in the background, but checks at
  most four pages at a time. A page that fails to parse or check is logged
  instead of causing an unhandled rejection.
- **`mosaic upload`** waits for every file to upload, uploads at most eight at a
  time, sends files as raw bytes (binary files were corrupted by utf-8
  decoding), and exits with an error if any upload fails.
- **`mosaic build`** now empties the snapshot folder completely. Previously
  sub-folders were never removed, so deleted or renamed pages lingered. A
  `--name` that resolves to the output directory itself or outside it (for
  example `.` or `../x`) is rejected, because that folder is emptied.
- **`StickyHeader`** removes its scroll listener on unmount.
- **Editor capabilities come only from the source.** Content could turn on the
  editor for a source that doesn't declare `writable`, either by setting
  `sourceCapabilities` or `sharedConfig.sourceCapabilities` in frontmatter,
  by pulling one in with a `$ref`, or by receiving another source's namespace
  shared config. Core and the site ignore capabilities in page frontmatter.
  The `SharedConfigPlugin` now sets `sourceCapabilities` in every
  `shared-config.json` from the source's declared capabilities after refs are
  resolved, and no longer copies them into another source.
