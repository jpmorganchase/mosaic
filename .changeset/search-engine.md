---
'@jpmorganchase/mosaic-site-middleware': patch
---

Add a search engine for search records

`@jpmorganchase/mosaic-site-middleware/search` exports `createSearchIndex`,
which searches the records in `search-records.json` on the server or in the
browser. It is built on MiniSearch and ranks results like Algolia's
tie-breaking criteria: words matched, exact title (ignoring plurals, stop words
and spaces), current namespace, typos, synonyms, where the words matched,
exact heading, page rank, then relevance. Results are grouped (one per page by
default) with their other matching sections, and include a snippet and the
matched terms for `highlight`.
