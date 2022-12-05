# Mosaic Layouts

`@jpmorganchase/mosaic-layouts`, containing re-usable Mosaic layouts and the UI elements needed to build your own layouts.

## Installation

`yarn add @jpmorganchase/mosaic-layouts`

## What is a layout component ?

These are the components that can be composed into full layouts.

- `<LayoutBase>` is a wrapper for all pages that includes a space for the fixed-position header and a space for the main content block.
- `<LayoutFullWidth>` is designed to sit directly inside `LayoutBase` and is a wrapper for full-width content (adding constraints for wide screens) and includes a space for the in-content-column footer.
- `<LayoutColumns>` is designed to sit directly inside `LayoutBase` and allows for multiple columned arrangements. There is a space for a primary sidebar that will be left-aligned. There is an optional space for a secondary sidebar that will sit to the right of the main content column.

### Example full-width layout

```
<LayoutBase Header={YourHeaderComponent}>
    <LayoutFullWidth Footer={YourFooterComponent}>
        {/* page content goes here */}
    <LayoutFullWidth/>
<LayoutBase/>
```

### Example layout with sidebars

```
<LayoutBase Header={YourHeaderComponent}>
    <LayoutColumns
        PrimarySidebar={YourLeftHandSidebarComponent}
        SecondarySidebar={YourRightHandSidebarComponent}
        Footer={YourFooterComponent}
    >
        {/* page content goes here */}
    <LayoutColumns/>
<LayoutBase/>
```
