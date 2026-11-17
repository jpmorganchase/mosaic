'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import { initializeStore, reseedStore, type SiteState } from './store';

/** Own a page store, replacing its data before paint when a new seed arrives. */
export function useMosaicStore(seed: Partial<SiteState>) {
  const [store] = useState(() => initializeStore(seed));
  const seededWith = useRef(seed);
  useLayoutEffect(() => {
    if (seededWith.current === seed) return;
    seededWith.current = seed;
    reseedStore(store, seed);
  }, [store, seed]);
  return store;
}
