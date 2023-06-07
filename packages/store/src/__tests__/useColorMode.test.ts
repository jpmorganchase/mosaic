import { describe, test, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createWrapper } from './utils/utils';
import { useColorMode } from '../useColorMode';

describe('GIVEN the `useColorMode` hook', () => {
  test('THEN the hook returns the colorMode', () => {
    const { result } = renderHook(() => useColorMode(), {
      wrapper: createWrapper()
    });
    expect(result.current.colorMode).toEqual('light');
  });

  describe('AND WHEN the setColorMode action is used', () => {
    test('THEN colorMode is updated', () => {
      const storeWrapper = createWrapper();

      const { result: useColorModeResult, rerender } = renderHook(() => useColorMode(), {
        wrapper: storeWrapper
      });

      expect(useColorModeResult.current.colorMode).toEqual('light');
      const { setColorMode } = useColorModeResult.current;

      act(() => {
        setColorMode('dark');
        rerender();
      });
      expect(useColorModeResult.current.colorMode).toEqual('dark');
    });
  });
});
