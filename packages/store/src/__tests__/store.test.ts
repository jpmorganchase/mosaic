import { describe, test, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import { createWrapper } from './test-utils/utils';
import { initializeStore, reseedStore, useCreateStore, useStore } from '../store';

describe('GIVEN the store initializer', () => {
  describe('WHEN no other state is provided', () => {
    test('THEN the store api provides the initial default state', () => {
      const storeApi = initializeStore();
      expect(storeApi.getState()).toEqual({
        breadcrumbs: [],
        navigation: {},
        sidebarData: [],
        tableOfContents: [],
        sharedConfig: {},
        description: undefined,
        layout: undefined,
        route: undefined,
        title: undefined
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
      expect(storeApi.getState()).toEqual({
        breadcrumbs: [],
        navigation: {},
        sidebarData: [],
        tableOfContents: [],
        sharedConfig: {},

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

      expect(currentState).toEqual({
        breadcrumbs: [],
        navigation: {},
        sidebarData: [],
        tableOfContents: [],
        sharedConfig: {},
        ...state,
        route: undefined,
        title: undefined
      });

      // update the state and rerender
      state.layout = 'new';
      state.description = 'description';
      rerender();

      currentState = result.current().getState();
      expect(currentState).toEqual({
        breadcrumbs: [],
        navigation: {},
        sidebarData: [],
        tableOfContents: [],
        sharedConfig: {},
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

      expect(currentState).toEqual({
        breadcrumbs: [],
        navigation: {},
        sidebarData: [],
        tableOfContents: [],
        sharedConfig: {},
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
      expect(currentState).toEqual({
        breadcrumbs: [],
        navigation: {},
        sidebarData: [],
        tableOfContents: [],
        sharedConfig: {},
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

      expect(currentState).toEqual({
        breadcrumbs: [],
        navigation: {},
        sidebarData: [],
        tableOfContents: [],
        sharedConfig: {},
        ...state,
        route: undefined,
        title: undefined
      });

      // update the state and rerender
      state.layout = 'new';
      state.description = 'description';
      rerender();

      currentState = result.current().getState();

      expect(currentState).toEqual({
        breadcrumbs: [],
        navigation: {},
        sidebarData: [],
        tableOfContents: [],
        sharedConfig: {},
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
  test('THEN creating and updating content stores has no storage or global listener side effects', () => {
    const addListener = vi.spyOn(window, 'addEventListener');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    try {
      const first = initializeStore({ title: 'First' });
      const second = initializeStore({ title: 'Second' });
      reseedStore(first, { title: 'Refreshed' });
      expect(second.getState().title).toBe('Second');
      expect(addListener).not.toHaveBeenCalled();
      expect(setItem).not.toHaveBeenCalled();
    } finally {
      addListener.mockRestore();
      setItem.mockRestore();
    }
  });
});

describe('GIVEN `reseedStore`', () => {
  test('THEN page data is replaced and omitted fields return to their defaults', () => {
    const store = initializeStore({
      title: 'Old title',
      layout: 'DetailTechnical',
      tableOfContents: [{ level: 0, id: 'old', text: 'Old' }]
    });
    reseedStore(store, { title: 'New title', layout: 'FullWidth' });
    expect(store.getState()).toEqual({
      breadcrumbs: [],
      navigation: {},
      sidebarData: [],
      tableOfContents: [],
      sharedConfig: {},
      description: undefined,
      route: undefined,
      title: 'New title',
      layout: 'FullWidth'
    });
  });
});
