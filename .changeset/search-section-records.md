---
'@jpmorganchase/mosaic-plugins': patch
'@jpmorganchase/mosaic-cli': patch
'@jpmorganchase/mosaic-types': patch
---

Write section-level search records

`SearchIndexPlugin` also writes `search-records.json`: one record for each
page's introduction and one for each section, with the section's heading
path, prose (without code), and the frontmatter fields set with the new
`records.fields` option (by default `description`, falling back to
`data.description`, and `keywords`). Section anchors use the same ids as the
rendered headings and the table of contents, so results can link to
`route#anchor`. Set `search: { exclude: true }` in a page's frontmatter to
leave it out, or `records: false` to turn the file off. The existing search
files are unchanged. The record format, `SearchRecord` and `SearchRecordsFile`,
is exported from `@jpmorganchase/mosaic-types`.

The default config now runs the plugin at priority `-1.5`, after `$RefPlugin`,
so titles and fields that come from `$ref`s are indexed resolved.
