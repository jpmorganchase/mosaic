---
'@jpmorganchase/mosaic-core': patch
'@jpmorganchase/mosaic-from-http-request': patch
'@jpmorganchase/mosaic-schemas': patch
'@jpmorganchase/mosaic-site': patch
'@jpmorganchase/mosaic-source-git-repo': patch
'@jpmorganchase/mosaic-source-http': patch
'@jpmorganchase/mosaic-types': patch
---

Feature: Source Schedules

Sources that pull content from a remote source, need to poll the source to ensure that any updates are pulled into the mosaic filesystem.

Source Schedules provide the ability to specify a global schedule that is applied to all sources, but with the ability to override this for individual sources.

A schedule is defined as:

```json
  schedule: {
    checkIntervalMins: 0.2,
    initialDelayMs: 2000
  },
```

Add the above to the root of a mosaic config file to set up a "global" schedule or to a specific source definition to set up a schedule for that source.

The remote sources listed below have been updated to ensure compatibility with source schedules:

- @jpmorganchase/mosaic-source-git-repo
- @jpmorganchase/mosaic-source-http
