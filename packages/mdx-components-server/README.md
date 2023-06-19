# Mosaic MDX Component Library (Server)

`@jpmorganchase/mosaic-components-server` contains re-usable MDX components that conform to the Mosaic Design language.

All the Mosaic MDX components are wrapped with default spacing so they can be composed within a MDX page

This package is intended to be used with a Mosaic site and should export "server side" components

## Installation

`yarn add @jpmorganchase/mosaic-components-server`

## Criteria

The criteria for a component within `@jpmorganchase/mosaic-components-server` is

- Should only export React server-side components (RSCs)
- It can contain any Mosaic Store, NextJS or other site specific dependencies.
