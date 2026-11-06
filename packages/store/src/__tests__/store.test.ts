import { describe, test, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import { createWrapper } from './test-utils/utils';
import {
  disposeStore,
  initializeStore,
  registerStore,
  reseedStore,
  SiteState,
  useCreateStore,
  useStore
} from '../store';

function getStateToVerify(currentState: SiteState) {
  let { actions, ...stateToVerify } = currentState;
  return stateToVerify;
}

describe('GIVEN the store initializer', () => {
  describe('WHEN no other state is provided', () => {
    test('THEN the store api provides the initial default state', () => {
      const storeApi = initializeStore();
      expect(getStateToVerify(storeApi.getState())).toEqual({
        breadcrumbs: [],
        navigation: {},
        sidebarData: [],
        tableOfContents: [],
        searchIndex: [],
        searchConfig: {},
        sharedConfig: {},
        description: undefined,
        layout: undefined,
        route: undefined,
        title: undefined,
        colorMode: 'light'
      });
    });
  });

  describe('WHEN additional state is preloaded', () => {
    test('THEN the store api provides the initial default state plus the preloaded state', () => {
      const state = {
        description: 'description',
        layout: 'layout',
        route: 'route',
        title: 'title'
      };

      const storeApi = initializeStore(state);
      expect(getStateToVerify(storeApi.getState())).toEqual({
        breadcrumbs: [],
        navigation: {},
        searchIndex: [],
        searchConfig: {},
        sidebarData: [],
        tableOfContents: [],
        sharedConfig: {},
        colorMode: 'light',

        ...state
      });
    });
  });
});

describe('GIVEN the `useCreateStore` hook', () => {
  describe('WHEN executed on the client', () => {
    test('THEN the store content is replaced', () => {
      const state = { layout: 'layout', description: 'des' };
      const { result, rerender } = renderHook(() => useCreateStore(state));
      let currentState = result.current().getState();

      expect(getStateToVerify(currentState)).toEqual({
        breadcrumbs: [],
        navigation: {},
        searchIndex: [],
        searchConfig: {},
        sidebarData: [],
        tableOfContents: [],
        sharedConfig: {},
        colorMode: 'light',
        ...state,
        route: undefined,
        title: undefined
      });

      // update the state and rerender
      state.layout = 'new';
      state.description = 'description';
      rerender();

      currentState = result.current().getState();
      expect(getStateToVerify(currentState)).toEqual({
        breadcrumbs: [],
        navigation: {},
        sidebarData: [],
        searchIndex: [],
        searchConfig: {},
        tableOfContents: [],
        sharedConfig: {},
        colorMode: 'light',
        description: 'description',
        layout: 'new',
        route: undefined,
        title: undefined
      });
    });
    test('THEN defaults applied when page props do not include default state', () => {
      const state: { layout?: string; description: string } = {
        layout: 'layout',
        description: 'des'
      };
      const { result, rerender } = renderHook(() => useCreateStore(state));
      let currentState = result.current().getState();

      expect(getStateToVerify(currentState)).toEqual({
        breadcrumbs: [],
        navigation: {},
        searchIndex: [],
        searchConfig: {},
        sidebarData: [],
        tableOfContents: [],
        sharedConfig: {},
        colorMode: 'light',
        ...state,
        route: undefined,
        title: undefined
      });

      /**
       * we use delete here because the idea is that the page does not indicate a layout IN ANY WAY
       * This is different from the page saying my layout is undefined
       */
      delete state.layout;
      state.description = 'description';
      rerender();

      currentState = result.current().getState();
      expect(getStateToVerify(currentState)).toEqual({
        breadcrumbs: [],
        navigation: {},
        sidebarData: [],
        searchIndex: [],
        searchConfig: {},
        tableOfContents: [],
        sharedConfig: {},
        colorMode: 'light',
        description: 'description',
        layout: undefined,
        route: undefined,
        title: undefined
      });
    });
  });

  describe('WHEN executed on the server', () => {
    test('THEN the store is always reinitialized', () => {
      const state = { layout: 'layout', description: 'des' };
      const { result, rerender } = renderHook(() => useCreateStore(state, true));
      let currentState = result.current().getState();

      expect(getStateToVerify(currentState)).toEqual({
        breadcrumbs: [],
        navigation: {},
        searchIndex: [],
        searchConfig: {},
        sidebarData: [],
        tableOfContents: [],
        sharedConfig: {},
        colorMode: 'light',
        ...state,
        route: undefined,
        title: undefined
      });

      // update the state and rerender
      state.layout = 'new';
      state.description = 'description';
      rerender();

      currentState = result.current().getState();

      expect(getStateToVerify(currentState)).toEqual({
        breadcrumbs: [],
        navigation: {},
        sidebarData: [],
        searchIndex: [],
        searchConfig: {},
        tableOfContents: [],
        sharedConfig: {},
        colorMode: 'light',
        description: 'description',
        layout: 'new',
        route: undefined,
        title: undefined
      });
    });
  });
});

describe('GIVEN the `useStore` hook', () => {
  describe('WHEN a selector is provided', () => {
    test('THEN the hook applies the selector and returns the selected state', () => {
      const { result } = renderHook(() => useStore(state => state.title), {
        wrapper: createWrapper({ title: 'title' })
      });
      expect(result.current).toEqual('title');
    });
  });

  describe('WHEN rendered outside of the StoreContext', () => {
    test('THEN the hook throws an error', () => {
      expect(() => renderHook(() => useStore(state => state.title))).toThrowError(
        'Missing StoreProvider in the tree'
      );
    });
  });
});

describe('GIVEN per-page stores', () => {
  test('THEN colour mode syncs between live stores and stops once a store is disposed', () => {
    const layoutStore = initializeStore();
    const pageStore = initializeStore();

    layoutStore.getState().actions.setColorMode('dark');
    expect(pageStore.getState().colorMode).toEqual('dark');

    disposeStore(pageStore);
    layoutStore.getState().actions.setColorMode('light');
    expect(pageStore.getState().colorMode).toEqual('dark');

    // Re-registering (e.g. after a StrictMode re-mount) resumes syncing.
    registerStore(pageStore);
    layoutStore.getState().actions.setColorMode('dark');
    expect(pageStore.getState().colorMode).toEqual('dark');
    layoutStore.getState().actions.setColorMode('light');
    expect(pageStore.getState().colorMode).toEqual('light');

    disposeStore(layoutStore);
    disposeStore(pageStore);
  });

  test('THEN disposing a store removes its storage listener', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const store = initializeStore();
    const listener = addSpy.mock.calls.find(([type]) => type === 'storage')?.[1];
    expect(listener).toBeDefined();

    disposeStore(store);
    expect(removeSpy).toHaveBeenCalledWith('storage', listener);
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});

describe('GIVEN `reseedStore`', () => {
  test('THEN the page state is replaced while colour mode and actions are kept', () => {
    const store = initializeStore({
      title: 'Old title',
      layout: 'DetailTechnical',
      tableOfContents: [{ level: 0, id: 'old', text: 'Old' }]
    });
    store.getState().actions.setColorMode('dark');
    const { actions } = store.getState();

    reseedStore(store, { title: 'New title', layout: 'FullWidth' });

    const state = store.getState();
    expect(getStateToVerify(state)).toEqual({
      breadcrumbs: [],
      navigation: {},
      searchIndex: [],
      searchConfig: {},
      sidebarData: [],
      // Missing from the new seed, so back to the default rather than stale.
      tableOfContents: [],
      sharedConfig: {},
      description: undefined,
      route: undefined,
      title: 'New title',
      layout: 'FullWidth',
      colorMode: 'dark'
    });
    expect(state.actions).toBe(actions);

    disposeStore(store);
  });

  test('THEN a seed cannot override colour mode or actions', () => {
    const store = initializeStore();
    const { actions, colorMode } = store.getState();
    const otherColorMode = colorMode === 'dark' ? 'light' : 'dark';

    reseedStore(store, { colorMode: otherColorMode, actions: undefined } as never);

    expect(store.getState().colorMode).toEqual(colorMode);
    expect(store.getState().actions).toBe(actions);

    disposeStore(store);
  });
});
