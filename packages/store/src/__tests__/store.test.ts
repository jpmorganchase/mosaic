import { describe, test, expect } from 'vitest';
import { type InitialStoreState, createStore } from '../store.js';

describe('GIVEN the createStore function', () => {
  describe('WHEN custom initial state is provided', () => {
    test('THEN it overrides the default initial state', () => {
      const initialState: InitialStoreState = {
        colorMode: 'dark'
      };

      const store = createStore(initialState);
      const state = store.getState();

      expect(state.colorMode).toEqual(initialState.colorMode);
    });
  });
});
