'use client';

import { layouts } from '@jpmorganchase/mosaic-layouts';

export function LayoutProvider({ name, children }) {
  const LayoutComponent = layouts[name];
  return <LayoutComponent>{children}</LayoutComponent>;
}
