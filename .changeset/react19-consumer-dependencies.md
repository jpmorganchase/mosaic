---
'@jpmorganchase/mosaic-site-components': patch
'@jpmorganchase/mosaic-site-middleware': patch
'@jpmorganchase/mosaic-content-editor-plugin': patch
'@jpmorganchase/mosaic-store': patch
---

Use the React 19 line of next-mdx-remote-client in the App Router host and published MDX renderer/compiler. Align their React and React DOM minimum with its React 19.1 requirement. The editor accepts both MDX runtime majors for hosts using either supported React version. Update SWR and Zustand minimums so existing consumers replace older React 18-only dependency selections when installing the snapshot.
