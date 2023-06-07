import type { ElementType } from 'react';
import { createStore as createZustandStore } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import type { ColorMode } from './useColorMode';

export type SiteState = {
  colorMode: ColorMode;
  ImageComponent: ElementType;
  LinkComponent: ElementType;
  actions: {
    setColorMode: (colorMode: ColorMode) => void;
  };
};

type PeristedStoreState = Pick<SiteState, 'colorMode'>;
export type DefaultSiteState = Omit<SiteState, 'actions'>;
export type InitialSiteState = Partial<DefaultSiteState>;

function getDefaultInitialState(initialState?: InitialSiteState): DefaultSiteState {
  return {
    colorMode: initialState?.colorMode || 'light',
    ImageComponent: initialState?.ImageComponent || 'img',
    LinkComponent: initialState?.LinkComponent || 'a'
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

export const createStore = (initialState?: InitialSiteState) =>
  createZustandStore(
    storeMiddlewares(set => ({
      ...getDefaultInitialState(initialState),
      actions: {
        setColorMode: (colorMode: ColorMode) => set({ colorMode })
      }
    }))
  );
