import { describe, test, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createWrapper } from './test-utils/utils';
import { useStoreActions } from '../useStoreActions';
import { useColorMode } from '../useColorMode';

describe('GIVEN the `useStoreActions` hook', () => {
  test('THEN there is a setColorMode action', () => {
    const { result } = renderHook(() => useStoreActions(), {
      wrapper: createWrapper()
    });
    expect(result.current.setColorMode).not.toBeUndefined();
  });

  describe('AND WHEN the setColorMode action is used', () => {
    test('THEN colorMode is updated', () => {
      const { result: useStoreActionsResult } = renderHook(() => useStoreActions(), {
        wrapper: createWrapper()
      });

      const { result: useColorModeResult, rerender } = renderHook(() => useColorMode(), {
        wrapper: createWrapper()
      });

      expect(useColorModeResult.current).toEqual('light');

      const { setColorMode } = useStoreActionsResult.current;

      act(() => {
        setColorMode('dark');
        rerender();
      });
      expect(useColorModeResult.current).toEqual('dark');
    });
  });
});
