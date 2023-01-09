import { renderHook } from '@testing-library/react';

import { createWrapper } from './test-utils/utils';
import { initializeStore, useCreateStore, useStore } from '../store';

describe('GIVEN the store initializer', () => {
  describe('WHEN no other state is provided', () => {
    test('THEN the store api provides the initial default state', () => {
      const storeApi = initializeStore();
      expect(storeApi.getState()).toEqual({
        breadcrumbs: [],
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
      expect(result.current().getState()).toEqual({
        breadcrumbs: [],
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

      expect(result.current().getState()).toEqual({
        breadcrumbs: [],
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

  describe('WHEN executed on the server', () => {
    test('THEN the store is always reinitialized', () => {
      const state = { layout: 'layout', description: 'des' };
      const { result, rerender } = renderHook(() => useCreateStore(state, true));
      expect(result.current().getState()).toEqual({
        breadcrumbs: [],
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

      expect(result.current().getState()).toEqual({
        breadcrumbs: [],
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
