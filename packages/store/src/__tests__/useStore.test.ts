import { renderHook } from '@testing-library/react';

import { createWrapper } from './utils/utils';
import { useStore } from '../useStore';

const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation();

describe('GIVEN the `useStore` hook', () => {
  describe('WHEN a selector is provided', () => {
    test('THEN the hook applies the selector and returns the selected state', () => {
      const { result } = renderHook(() => useStore(state => state.colorMode), {
        wrapper: createWrapper({ colorMode: 'dark' })
      });
      expect(result.current).toEqual('dark');
    });
  });

  describe('WHEN rendered outside of the StoreContext', () => {
    afterAll(() => {
      consoleErrorMock.mockRestore();
    });
    test('THEN the hook throws an error', () => {
      expect(() => renderHook(() => useStore(state => state.colorMode))).toThrowError(
        'Missing StoreProvider in the tree'
      );
    });
  });
});
