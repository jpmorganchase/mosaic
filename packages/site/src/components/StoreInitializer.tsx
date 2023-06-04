'use client';

import { useRef } from 'react';

import { useStore } from '@jpmorganchase/mosaic-store';
import type { SiteState } from '@jpmorganchase/mosaic-store';

function StoreInitializer({ state }: { state: SiteState }) {
  const initialized = useRef(false);
  if (!initialized.current) {
    useStore.setState(state);
    initialized.current = true;
  }
  return null;
}

export default StoreInitializer;
