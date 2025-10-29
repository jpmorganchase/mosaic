# @jpmorganchase/mosaic-icons

## 0.1.0-beta.95

### Minor Changes

- 7e4a9788: Remove @salt-ds/lab usage.

### Patch Changes

- Updated dependencies [7e4a9788]
  - @jpmorganchase/mosaic-theme@0.1.0-beta.95

## 0.1.0-beta.94

### Patch Changes

- @jpmorganchase/mosaic-theme@0.1.0-beta.94

## 0.1.0-beta.93

### Patch Changes

- @jpmorganchase/mosaic-theme@0.1.0-beta.93

## 0.1.0-beta.92

### Patch Changes

- c5b7a75c: Pip Salt and re-align to Salt theme

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

- Updated dependencies [c5b7a75c]
  - @jpmorganchase/mosaic-theme@0.1.0-beta.92

## 0.1.0-beta.91

### Patch Changes

- @jpmorganchase/mosaic-theme@0.1.0-beta.91

## 0.1.0-beta.90

### Patch Changes

- @jpmorganchase/mosaic-theme@0.1.0-beta.90
