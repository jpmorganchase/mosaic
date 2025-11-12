---
'@jpmorganchase/mosaic-source-storybook': patch
'@jpmorganchase/mosaic-from-http-request': patch
'@jpmorganchase/mosaic-source-readme': patch
'@jpmorganchase/mosaic-source-figma': patch
'@jpmorganchase/mosaic-source-http': patch
'@jpmorganchase/mosaic-types': patch
---

Improve error handling

Improve error handling of `fromHTTPRequest` and `createHttpSource`.
An object is now returned providing the successful responses and also an error for each failed request.
This enables you to process the error in your Source but also fixes an issue where, one bad request would
drop all the other successful responses.
