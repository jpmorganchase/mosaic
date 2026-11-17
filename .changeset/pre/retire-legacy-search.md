---
'@jpmorganchase/mosaic-site-components': major
'@jpmorganchase/mosaic-site-middleware': major
'@jpmorganchase/mosaic-store': major
'@jpmorganchase/mosaic-plugins': major
'@jpmorganchase/mosaic-cli': patch
---

Migrate the built-in header to section-level search and retire the legacy Fuse search path.

Server sites query `/api/search`; static exports lazily load `search-records.json` and the existing browser search engine. Results include section links, loading/error states, safe text highlighting, and protection against stale responses. `SearchProvider` configures server/browser mode, custom endpoints, namespace preference, and disabling search independently of the page store.

`SearchIndexPlugin` now emits only records. Remove its legacy `keys`, `relevancy`, `maxLineLength`, and `maxLineCount` options, and regenerate existing snapshots. `getSearchData`, `useSearchIndex`, the store's search types/fields, and the unused header search fields are removed. Replace them with `SearchProvider`, `createSearchHandler`, or `createSearchIndex`. The reference site no longer loads legacy search data into its namespace/404 stores and cleans up previously generated legacy public assets.
