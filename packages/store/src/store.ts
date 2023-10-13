import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import type { ColorMode } from './useColorMode';

export type SiteState = {
  colorMode: ColorMode;
  actions: {
    setColorMode: (colorMode: ColorMode) => void;
  };
};

type PeristedStoreState = Pick<SiteState, 'colorMode'>;
type DefaultSiteState = Omit<SiteState, 'actions'>;

function getDefaultInitialState(): DefaultSiteState {
  return {
    colorMode: 'light'
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
      setColorMode: (colorMode: ColorMode) => set({ colorMode })
    }
  }))
);

export { useStore };
