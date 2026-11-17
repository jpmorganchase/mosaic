---
'@jpmorganchase/mosaic-site-components': major
---

Remove the `OpenAPI` MDX component and stop publishing `@jpmorganchase/mosaic-open-api-component`.

`<OpenAPI>` is no longer one of the default MDX components, so pages that use it fail to render. Link to your API's hosted Swagger UI instead, or add your own component to `hostComponents` in `MdxComponents.ts`. Remove `@jpmorganchase/mosaic-open-api-component` from your dependencies and from `transpilePackages` in `next.config.js`.
