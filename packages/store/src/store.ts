import type { ElementType } from 'react';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import type { ColorMode } from './useColorMode';

export type SiteState = {
  colorMode: ColorMode;
  LinkComponent: ElementType;
  actions: {
    setColorMode: (colorMode: ColorMode) => void;
    setLinkComponent: (component: ElementType) => void;
  };
};

type PeristedStoreState = Pick<SiteState, 'colorMode'>;
type DefaultSiteState = Omit<SiteState, 'actions'>;

function getDefaultInitialState(): DefaultSiteState {
  return {
    colorMode: 'light',
    LinkComponent: 'a'
  };
}

const storeMiddlewares = stateCreatorFn =>
  devtools(
    persist<SiteState, [], [], PeristedStoreState>(stateCreatorFn, {
      name: 'mosaic-theme-pref',
      partialize: (state: SiteState) => ({
        colorMode: state.colorMode
      })
    })
  );

const useStore = create(
  storeMiddlewares(set => ({
    ...getDefaultInitialState(),
    actions: {
      setColorMode: (colorMode: ColorMode) => set({ colorMode }),
      setLinkComponent: (component: ElementType) => set({ LinkComponent: component })
    }
  }))
);

export { useStore };
