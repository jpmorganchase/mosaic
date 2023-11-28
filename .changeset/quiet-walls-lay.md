---
'@jpmorganchase/mosaic-source-http': patch
'@jpmorganchase/mosaic-source-storybook': patch
---

## HTTP Source `noProxy` option

The `noProxy` option is a regex used to check if an endpoint in the `endpoints` collection should create an http proxy agent for the request.

## `createHttpSource` `configuredRequests` option

When an http source is created using the `createHttpSource` function, instead of supplying a collection of endpoints, a `configuredRequests` option can be used to provide a collection of [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) objects.

This gives full control over the request configuration to the user.

_Should both `endpoints` and `configuredRequests` be provided then endpoints will take precedence._

## Storybook Source

Storybook config in the `stories` option can now specify a `proxyEndpoint`.
