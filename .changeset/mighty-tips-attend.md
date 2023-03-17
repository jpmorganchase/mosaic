---
'@jpmorganchase/mosaic-theme': minor
'@jpmorganchase/mosaic-cli': minor
'@jpmorganchase/mosaic-components': minor
'@jpmorganchase/mosaic-labs-components': minor
'@jpmorganchase/mosaic-content-editor-plugin': minor
'@jpmorganchase/mosaic-core': minor
'@jpmorganchase/mosaic-create-site': minor
'@jpmorganchase/mosaic-from-http-request': minor
'@jpmorganchase/mosaic-layouts': minor
'@jpmorganchase/mosaic-open-api-component': minor
'@jpmorganchase/mosaic-plugins': minor
'@jpmorganchase/mosaic-schemas': minor
'@jpmorganchase/mosaic-serialisers': minor
'@jpmorganchase/mosaic-site': minor
'@jpmorganchase/mosaic-site-components': minor
'@jpmorganchase/mosaic-site-middleware': minor
'@jpmorganchase/mosaic-site-preset-styles': minor
'@jpmorganchase/mosaic-source-git-repo': minor
'@jpmorganchase/mosaic-source-http': minor
'@jpmorganchase/mosaic-source-local-folder': minor
'@jpmorganchase/mosaic-standard-generator': minor
'@jpmorganchase/mosaic-store': minor
'@jpmorganchase/mosaic-types': minor
'@jpmorganchase/mosaic-workflows': minor
---

## Mosaic Theme

The theme variables are now globally scoped and prefixed with `mosaic`.

## BrokenLinksPlugin

The `BrokenLinksPlugin` uses a running instance of mosaic to verify that all links in the source pages are alive.

If mosaic is running behind a corporate proxy, the `proxyEndpoint` option is required to fetch external URLs.

Configuration:

```json
 {
      modulePath: '@jpmorganchase/mosaic-plugins/BrokenLinksPlugin',
      priority: -1,
      // Exclude this plugin in builds
      runTimeOnly: true,
      options: {
        baseUrl: process.env.MOSAIC_ACTIVE_MODE_URL || 'http://localhost:8080',
        proxyEndpoint: 'http://some-proxy-url'
      }
    }
```

## Next/Prev button

The next and prev buttons are visible again on pages that have a layout that uses these buttons.
