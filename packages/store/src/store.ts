import type { ElementType } from 'react';
import { createStore as createZustandStore } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import type { ColorMode } from './useColorMode';

export type StoreState = {
  colorMode: ColorMode;
  ImageComponent: ElementType;
  LinkComponent: ElementType;
  actions: {
    setColorMode: (colorMode: ColorMode) => void;
  };
};

type PeristedStoreState = Pick<StoreState, 'colorMode'>;
export type DefaultStoreState = Omit<StoreState, 'actions'>;
export type InitialStoreState = Partial<DefaultStoreState>;

function getDefaultInitialState(initialState?: InitialStoreState): DefaultStoreState {
  return {
    colorMode: 'light',
    ImageComponent: 'img',
    LinkComponent: 'a',
    ...initialState
  };
}

const storeMiddlewares = stateCreatorFn =>
  devtools(
    persist<StoreState, [], [], PeristedStoreState>(stateCreatorFn, {
      name: 'mosaic-theme-pref',
      skipHydration: true,
      partialize: (state: StoreState) => ({
        colorMode: state.colorMode
      })
    })
  );

export const createStore = (initialState?: InitialStoreState) =>
  createZustandStore(
    storeMiddlewares(set => ({
      ...getDefaultInitialState(initialState),
      actions: {
        setColorMode: (colorMode: ColorMode) => set({ colorMode })
      }
    }))
  );
