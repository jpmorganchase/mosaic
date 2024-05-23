---
'@jpmorganchase/mosaic-components': patch
'@jpmorganchase/mosaic-layouts': patch
'@jpmorganchase/mosaic-plugins': patch
'@jpmorganchase/mosaic-site-components': patch
'@jpmorganchase/mosaic-site-middleware': patch
---

- Tactical fix to remove `react-pro-sidebar` and replace with Salt's `NavigationItem`. We will remove this local `NavigationItem` once Salt merges it's own PR.
