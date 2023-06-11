'use client';
import React from 'react';

//import {useCreateStore, useStore} from '@jpmorganchase/mosaic-store';
import type { SiteState } from '@jpmorganchase/mosaic-store';

function StoreProvider({ state }: { state: SiteState, children: React.ReactElement }) {
  console.log(state);
  // const storeProps = { sharedConfig, searchIndex, searchConfig, ...frontmatter };
  // const createStore = useCreateStore(storeProps);
  return <>{children}</>
}

export default StoreProvider;
