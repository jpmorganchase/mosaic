---
'@jpmorganchase/mosaic-layouts': patch
'@jpmorganchase/mosaic-site': patch
---

## Feature

Provide the ability to set the default page layout at the root of a Mosaic site. Pages without a layout in their metadata will use this layout.

```
<LayoutProvider layoutComponents={layoutComponents} defaultLayout='DetailTechnical'>
    <Page/>
</LayoutProvider>
```
