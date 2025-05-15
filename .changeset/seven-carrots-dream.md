---
'@jpmorganchase/mosaic-components': patch
'@jpmorganchase/mosaic-content-editor-plugin': patch
'@jpmorganchase/mosaic-icons': patch
'@jpmorganchase/mosaic-layouts': patch
'@jpmorganchase/mosaic-site': patch
'@jpmorganchase/mosaic-site-components': patch
'@jpmorganchase/mosaic-site-preset-styles': patch
'@jpmorganchase/mosaic-sitemap-component': patch
'@jpmorganchase/mosaic-theme': patch
---

Pip Salt and re-align to Salt theme

Mosaic was initially developed as an internal documentation tool when the Salt Design System lacked several components necessary for building a comprehensive documentation site. Currently, Salt utilizes Mosaic for its documentation, but there are redundancies in themes and components, along with inconsistencies in design standards.

In this release, we are beginning the process of phasing out the Mosaic theme and eliminating duplicated components, opting instead to use Salt's components directly. This update includes the latest Salt dependencies and initiates the replacement of Mosaic components with their Salt counterparts. Additionally, we are removing the Mosaic-specific theme, aiming to make the site customizable through the Salt theme in the future.

Key Changes:

Markdown headings and code styles are now sourced from Salt.
The Prism code highlighter has been replaced with Shiki.
The Tile component has been refactored to utilize Salt's Card-based solution.
The TileLink component has been refactored.
The Card component has been swapped for Salt's Card.
This update is largely non-breaking. However, changes are required in the documentation for Tiles and Cards, which now utilize Salt's Grid layout. This necessitates defining columns and rows:

```diff
- <Tiles>
- </Tiles>
+ <Tiles columns={4} rows={1}>
+ <Tiles>
```

If your documentation includes these components, updating the values will resolve any sizing issues. Otherwise, they will default to 12 columns, which may be too narrow.
