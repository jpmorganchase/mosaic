import { describe, test, expect } from 'vitest';
import { renderHook } from '@testing-library/react';

import { createWrapper } from './utils/utils';
import { useLinkComponent } from '../useLinkComponent';

describe('GIVEN the `useLinkComponent` hook', () => {
  describe('WHEN a user does **not** provide a LinkComponent', () => {
    test('THEN the anchor element is returned', () => {
      const { result } = renderHook(() => useLinkComponent(), {
        wrapper: createWrapper()
      });
      expect(result.current).toEqual('a');
    });
  });

  describe('WHEN a user does provide a LinkComponent', () => {
    test('THEN the hook returns the layout', () => {
      const myLinkComponent = () => 'hi';

      const { result } = renderHook(() => useLinkComponent(), {
        wrapper: createWrapper({ LinkComponent: myLinkComponent })
      });
      expect(result.current).toEqual(myLinkComponent);
    });
  });
});
