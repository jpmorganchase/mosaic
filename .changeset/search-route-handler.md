---
'@jpmorganchase/mosaic-site-middleware': patch
---

Add a search route handler

`createSearchHandler()` is a `GET` route handler that searches the site's
`search-records.json`, from the snapshot or the active-mode content server.
It takes `q`, `namespace`, `namespaces`, `limit` and `sections` query
parameters and responds with `{ query, results }`. The index is kept in
memory: snapshot mode reloads it when the file changes, and active mode
checks the content server every `maxAge` (30 seconds by default) while
answering from the loaded index. `loadSearchRecords()` reads the records
without searching them.
