import { afterEach, describe, test, expect } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { createWrapper } from './test-utils/utils';
import { useStoreActions } from '../useStoreActions';
import { useColorMode } from '../useColorMode';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('GIVEN the `useStoreActions` hook', () => {
  test('THEN there is a setColorMode action', () => {
    const { result } = renderHook(() => useStoreActions(), {
      wrapper: createWrapper()
    });
    expect(result.current.setColorMode).not.toBeUndefined();
  });

  describe('AND WHEN the setColorMode action is used', () => {
    test('THEN colorMode is updated', () => {
      const { result } = renderHook(() => ({ mode: useColorMode(), actions: useStoreActions() }), {
        wrapper: createWrapper()
      });
      expect(result.current.mode).toEqual('light');
      act(() => result.current.actions.setColorMode('dark'));
      expect(result.current.mode).toEqual('dark');
    });
  });
});
