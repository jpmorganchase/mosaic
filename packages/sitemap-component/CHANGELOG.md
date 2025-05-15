# @jpmorganchase/mosaic-sitemap-component

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
  - @jpmorganchase/mosaic-components@0.1.0-beta.92

## 0.1.0-beta.91

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.91

## 0.1.0-beta.90

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.90

## 0.1.0-beta.89

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.89

## 0.1.0-beta.88

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.88

## 0.1.0-beta.87

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.87

## 0.1.0-beta.86

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.86

## 0.1.0-beta.85

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.85

## 0.1.0-beta.84

### Patch Changes

- Updated dependencies [49cbe9fd]
  - @jpmorganchase/mosaic-components@0.1.0-beta.84

## 0.1.0-beta.83

### Patch Changes

- 8e96ed0c: Updated Salt packages.
- Updated dependencies [24551c8d]
- Updated dependencies [8e96ed0c]
  - @jpmorganchase/mosaic-components@0.1.0-beta.83

## 0.1.0-beta.82

### Patch Changes

- Updated dependencies [fb689099]
  - @jpmorganchase/mosaic-components@0.1.0-beta.82

## 0.1.0-beta.81

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.81

## 0.1.0-beta.80

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.80

## 0.1.0-beta.79

### Patch Changes

- Updated dependencies [244ed5c3]
  - @jpmorganchase/mosaic-components@0.1.0-beta.79

## 0.1.0-beta.78

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.78

## 0.1.0-beta.77

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.77

## 0.1.0-beta.76

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.76

## 0.1.0-beta.75

### Patch Changes

- Updated dependencies [ffc03a18]
- Updated dependencies [fd6d715d]
  - @jpmorganchase/mosaic-components@0.1.0-beta.75

## 0.1.0-beta.74

### Patch Changes

- 2d4e5616: Pipped Salt DS to @salt-ds/core 1.26.0
- Updated dependencies [2d4e5616]
  - @jpmorganchase/mosaic-components@0.1.0-beta.74

## 0.1.0-beta.73

### Patch Changes

- de00c017: Added the files package.json field to all of the packages to prevent unnecessary files being published.
- Updated dependencies [de00c017]
  - @jpmorganchase/mosaic-components@0.1.0-beta.73

## 0.1.0-beta.72

### Patch Changes

- e5d14ab4: Upgraded Salt packages to:

  @salt-ds/core@1.22.0
  @salt-ds/lab@1.0.0-alpha.38
  @salt-ds/theme@1.13.1

- Updated dependencies [e5d14ab4]
  - @jpmorganchase/mosaic-components@0.1.0-beta.72

## 0.1.0-beta.71

### Patch Changes

- d79533a2: `initialNamespaceFilters` should filter the initial Sitemap view
  - @jpmorganchase/mosaic-components@0.1.0-beta.71

## 0.1.0-beta.70

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.70

## 0.1.0-beta.69

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.69

## 0.1.0-beta.68

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.68

## 0.1.0-beta.67

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.67

## 0.1.0-beta.66

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.66

## 0.1.0-beta.65

### Patch Changes

- @jpmorganchase/mosaic-components@0.1.0-beta.65

## 0.1.0-beta.64

### Patch Changes

- e7fa108a: light/dark theming support for sitemap component
  - @jpmorganchase/mosaic-components@0.1.0-beta.64

## 0.1.0-beta.63

### Patch Changes

- 680eb0eb: - add `@jpmorganchase/mosaic-sitemap-component`, a visualiser for `sitemap.xml`
  - fix bug in call to `setData` from `addSource` that merges rather than concatenates arrays
- Updated dependencies [680eb0eb]
  - @jpmorganchase/mosaic-components@0.1.0-beta.63
