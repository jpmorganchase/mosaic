'use client';

import React from 'react';
import { useCreateStore, StoreProvider as StoreProviderClient } from '@jpmorganchase/mosaic-store';
import type { SiteState } from '@jpmorganchase/mosaic-store';

function StoreProvider({ value, children }: { value: SiteState; children: React.ReactNode }) {
  const createStore = useCreateStore(value);
  return <StoreProviderClient value={createStore()}>{children}</StoreProviderClient>;
}

export default StoreProvider;
