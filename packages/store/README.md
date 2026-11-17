# Mosaic Site Store

`@jpmorganchase/mosaic-store` an extendable API for accessing Mosaic state and props.

The Mosaic store is based on [Zustand](https://zustand-demo.pmnd.rs/).

## Installation

`yarn add @jpmorganchase/mosaic-store`

The Redux DevTools chrome extension can be used to view the contents of the store if required.

## Theme preferences and page content

Mount one `ColorModeProvider` above the site's `ThemeProvider` and all content
stores. It owns the colour preference, persistence and cross-tab updates.
Page and header stores contain only document data and can be replaced or reseeded
without changing the theme.

```tsx
'use client';

import type { ReactNode } from 'react';
import { ColorModeProvider } from '@jpmorganchase/mosaic-store';
import { ThemeProvider } from '@jpmorganchase/mosaic-components';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ColorModeProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </ColorModeProvider>
  );
}
```

Create each content store once per page instance and mount its `StoreProvider`
inside this tree, as shown by the reference site's `StoreShell`.

`useColorMode()` and `useStoreActions().setColorMode()` retain their signatures
and now read the `ColorModeProvider`, independently of the nearest `StoreProvider`.
The existing `mosaic-theme-pref` storage key and `{ state: { colorMode }, version: 0 }`
format are unchanged. Server rendering and initial hydration use `light`; the
reference site's inline theme script applies the saved preference before first
paint, and the provider restores it after hydration.

### Migrating existing stores

- Add `ColorModeProvider` once above every theme consumer, including error pages.
- Replace `useStore(state => state.colorMode)` with `useColorMode()`.
- Replace `useStore(state => state.actions)` with `useStoreActions()`.
- Remove `colorMode` and `actions` from `SiteState` seeds and direct store access.
- Remove `registerStore` and `disposeStore` imports and calls. Content stores no
  longer register global listeners and need no lifecycle cleanup.
- Remove a root content store that exists only to supply the theme. Keep stores
  supplying page or persistent-header configuration.

Direct non-React access to theme state through a content store is no longer
supported. Pass the colour mode or setter from the theme hooks to that code.
