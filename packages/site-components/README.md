# Mosaic Site Components Library

`@jpmorganchase/mosaic-site-components` contains site specific UI components that conform to the Mosaic Design language.
A typical Site component is Mosaic specific.

Site **can** contain Next JS specific dependencies.

## Features

1. Components are themeable and by default support light/dark modes.

## Installation

`yarn add @jpmorganchase/mosaic-site-components`

## MDX hydration boundary

`createMdxRenderer` preserves the host's component and scope overrides. It renders
without a Suspense boundary by default, keeping existing navigation behavior.
Hosts can opt into a boundary around the compiled MDX body:

```tsx
'use client';

import { createMdxRenderer } from '@jpmorganchase/mosaic-site-components';

export const MdxRenderer = createMdxRenderer({
  suspense: { fallback: <p>Loading content…</p> }
});
```

Use `suspense: {}` for an empty fallback, or omit the option (or set it to `false`)
to retain the existing behavior. This inner boundary lets React recover an MDX
hydration mismatch without replacing correctly hydrated surrounding UI. It also
supplies a fallback when an authored component suspends. Compile errors continue
to propagate to the host's error boundary.

This is separate from a route-level `loading.tsx` or a boundary around server
content loading. Test client navigation and any suspending content before enabling
it in a host: a newly mounted boundary may display its fallback. The option does
not repair invalid HTML or remove the requirement for matching initial renders.
