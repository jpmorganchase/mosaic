---
'@jpmorganchase/mosaic-core': patch
'@jpmorganchase/mosaic-schemas': patch
'@jpmorganchase/mosaic-site': patch
---

## Feature: Source Retries

The source retries feature gracefully handles re-requesting content from a source that has thrown an error. Retries follow an exponential back-off strategy and will eventually rethrow the error when all retry attempts have been exhausted.

The retry configuration is specified as part of the source schedule e.g.

```
  schedule: {
    checkIntervalMins: 0.2,
    initialDelayMs: 2000,
    retryDelayMins: 5,
    maxRetries: 30,
    retryEnabled: true
  },
```
