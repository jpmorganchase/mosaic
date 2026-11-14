---
'@jpmorganchase/mosaic-plugins': patch
'@jpmorganchase/mosaic-cli': patch
'@jpmorganchase/mosaic-types': patch
'@jpmorganchase/mosaic-site-middleware': patch
---

Add section-level site search

`SearchIndexPlugin` also writes `search-records.json`: one record for each
page's introduction and one for each section, with the section's heading path,
prose (without code), and the frontmatter fields set with the new
`records.fields` option. By default these are `description` (falling back to
`data.description`) and `keywords`. Section anchors use the same ids as the
rendered headings and the table of contents, so results link to
`route#anchor`. To leave a page out, set `search: { exclude: true }` in its
frontmatter; to turn the file off, set `records: false`. The existing search
files are unchanged. The record format, `SearchRecord` and
`SearchRecordsFile`, is exported from `@jpmorganchase/mosaic-types`. The
default config now runs the plugin at priority `-1.5`, after `$RefPlugin`, so
titles and fields that come from `$ref`s are resolved.

`@jpmorganchase/mosaic-site-middleware/search` exports `createSearchIndex`,
which searches the records on the server or in the browser. It is built on
MiniSearch and ranks results by Algolia-style tie-breaks: words matched, exact
title (ignoring plurals, stop words and spaces), current namespace, typos,
synonyms, where the words matched, exact heading, page rank, then relevance.
Results are grouped (one per page by default) with their other matching
sections, and include a snippet and the matched terms for `highlight`.

`createSearchHandler()` is a `GET` route handler over the records, from the
snapshot or the active-mode content server. It takes `q`, `namespace`,
`namespaces`, `limit` and `sections` query parameters and responds with
`{ query, results }`. The index is kept in memory: snapshot mode reloads it
when the file changes, and active mode checks the content server every
`maxAge` while answering from the loaded index. `loadSearchRecords()` reads the
records without searching them.
