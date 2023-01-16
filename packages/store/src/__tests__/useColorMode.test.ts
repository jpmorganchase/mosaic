import { renderHook } from '@testing-library/react';
import { createWrapper } from './test-utils/utils';
import { useColorMode } from '../useColorMode';

describe('GIVEN the `useColorMode` hook', () => {
  test('THEN the hook returns the colorMode', () => {
    const { result } = renderHook(() => useColorMode(), {
      wrapper: createWrapper()
    });
    expect(result.current).toEqual('light');
  });
});
