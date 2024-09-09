import { describe, test, expect } from 'vitest';
import { renderHook } from '@testing-library/react';

import { createWrapper } from './test-utils/utils';
import { useLayout } from '../useLayout';

describe('GIVEN the `useLayout` hook', () => {
  describe('WHEN there is no layout in the store', () => {
    test('THEN the hook returns undefined', () => {
      const { result } = renderHook(() => useLayout(), {
        wrapper: createWrapper()
      });
      expect(result.current.layout).toBeUndefined();
    });
  });

  describe('WHEN there is a layout in the store', () => {
    test('THEN the hook returns the layout', () => {
      const { result } = renderHook(() => useLayout(), {
        wrapper: createWrapper({ layout: 'LayoutName' })
      });
      expect(result.current.layout).toEqual('LayoutName');
    });
  });
});
