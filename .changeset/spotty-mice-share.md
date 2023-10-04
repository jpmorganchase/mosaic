---
'@jpmorganchase/mosaic-cli': patch
'@jpmorganchase/mosaic-plugins': patch
'@jpmorganchase/mosaic-schemas': patch
---

### Feat

`enableSourcePush` is now a property of the Mosaic Config file. This functionality was previously configured using an environment variable `process.env.MOSAIC_ENABLE_SOURCE_PUSH`

### Fix

The Admin API that returned the Mosaic config file now strips credentials from git reo sources

### Refactor

Fastify is now used as the web server powering the `serve` functionality of the Mosaic CLI.
