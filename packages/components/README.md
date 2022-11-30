# Mosaic Component Library

`@dpmosaic/components` contains re-usable UI components that conform to the Mosaic Design language.

All the Mosaic UI components are available within the MDX context of a Mosaic site but equally could be used outside a  
Mosaic site.

## Installation

`yarn add @dpmosaic/components`

## Criteria

The criteria for a component within `@dpmosaic/components` is

- It can be used outside the Mosaic site with only Mosaic theme dependencies.
- It **should not** contain any Mosaic Store, NextJS or other site specific dependencies.

## Labs

The `src/labs` directory contains 'alpha' components which are NOT yet ready for use in production.  
It's an experimentation area, some of these components might never be used or are in-complete.
