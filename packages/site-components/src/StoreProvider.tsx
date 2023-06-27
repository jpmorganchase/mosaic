import React from 'react';
import { useCreateStore, StoreProvider as StoreProviderClient } from '@jpmorganchase/mosaic-store';
import type { SiteState } from '@jpmorganchase/mosaic-store';

export function StoreProvider({
  value,
  children
}: {
  value: Partial<SiteState>;
  children: React.ReactNode;
}) {
  const createStore = useCreateStore(value);
  return <StoreProviderClient value={createStore()}>{children}</StoreProviderClient>;
}
