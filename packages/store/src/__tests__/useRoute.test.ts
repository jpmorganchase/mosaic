import { describe, expect, test } from 'vitest';
import { renderHook } from '@testing-library/react';

import { createWrapper } from './test-utils/utils';
import { useRoute } from '../useRoute';

describe('GIVEN the `useRoute` hook', () => {
  describe('WHEN there is no route in the store', () => {
    test('THEN the hook returns no route', () => {
      const { result } = renderHook(() => useRoute(), {
        wrapper: createWrapper()
      });
      expect(result.current.route).toBeUndefined();
    });
  });

  describe('WHEN there is a route in the store', () => {
    test('THEN the hook returns the route', () => {
      const { result } = renderHook(() => useRoute(), {
        wrapper: createWrapper({ route: 'a/route/to/a/page' })
      });
      expect(result.current.route).toEqual('a/route/to/a/page');
    });
  });
});
