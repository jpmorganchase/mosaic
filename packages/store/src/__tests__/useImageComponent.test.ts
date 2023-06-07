import { renderHook } from '@testing-library/react';

import { createWrapper } from './utils/utils';
import { useImageComponent } from '../useImageComponent';

describe('GIVEN the `useImageComponent` hook', () => {
  describe('WHEN a user does **not** provide an ImageComponent', () => {
    test('THEN the img element is returned', () => {
      const { result } = renderHook(() => useImageComponent(), {
        wrapper: createWrapper()
      });
      expect(result.current).toEqual('img');
    });
  });

  describe('WHEN a user does provide a ImageComponent', () => {
    test('THEN the hook returns the layout', () => {
      const myImageComponent = () => 'hi';

      const { result } = renderHook(() => useImageComponent(), {
        wrapper: createWrapper({ ImageComponent: myImageComponent })
      });
      expect(result.current).toEqual(myImageComponent);
    });
  });
});
