---
'@jpmorganchase/mosaic-cli': patch
'@jpmorganchase/mosaic-core': patch
'@jpmorganchase/mosaic-plugins': patch
'@jpmorganchase/mosaic-types': patch
---

## Feature

Any exception raised by plugins during any part of the plugin lifecycle are converted to instances of PluginError and tracked by the source that is running the plugins. This means plugin errors do not cause the source to close and content will continue to be served by Mosaic.

Plugin authors should be encouraged to throw a `PluginError` as should an error occur when processing a particular page, then the full path to the page can be included in the error descriptor.

Plugin errors are not currently surfaced to a Mosaic site but can be viewed using the list sources admin API.

## Fix

The `saveContent` plugin lifecycle method is removed. This concept was replaced with workflows some time ago and should have been removed then.
