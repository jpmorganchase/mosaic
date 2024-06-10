---
'@jpmorganchase/mosaic-plugins': patch
'@jpmorganchase/mosaic-site-components': patch
'@jpmorganchase/mosaic-store': patch
---

feat: align to Salt Vertical Navigation pattern

- groups now expand and collapse and do not select a route
- sidebar group label can be defined through frontmatter `sidebar.groupLabel`
- breadcrumbs do not display the root page
- pagination now steps through all pages within the user journey
- paginator buttons show the group, as well as the page title
