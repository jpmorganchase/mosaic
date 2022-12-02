import React from 'react';
import { renderHook } from '@testing-library/react-hooks';

import { BaseUrlProvider, useResolveRelativeUrl } from '../BaseUrlProvider';

jest.mock('@jpmorganchase/mosaic-store', () => ({
  useRoute: jest.fn(() => ({ route: '/a/b/c' }))
}));

const ProviderWrapper: React.FC = ({ children }) => (
  <BaseUrlProvider value="/a/b/c">{children}</BaseUrlProvider>
);

describe('GIVEN useResolveRelativeUrl', () => {
  test('returns a relative path resolved with the base path', () => {
    const { result } = renderHook(() => useResolveRelativeUrl('./c/d/e'), {
      wrapper: ProviderWrapper
    });
    expect(result.current).toEqual('/a/b/c/d/e');
  });
  test('returns a relative path+anchor resolved with the base path', () => {
    const { result } = renderHook(() => useResolveRelativeUrl('./c/d/e#anchor'), {
      wrapper: ProviderWrapper
    });
    expect(result.current).toEqual('/a/b/c/d/e#anchor');
  });
  test('returns the original path for external URLs', () => {
    const { result } = renderHook(() => useResolveRelativeUrl('http://jpmorgan.com'), {
      wrapper: ProviderWrapper
    });
    expect(result.current).toEqual('http://jpmorgan.com');
  });
  test('returns the original path for local anchors', () => {
    const { result } = renderHook(() => useResolveRelativeUrl('#anchor'), {
      wrapper: ProviderWrapper
    });
    expect(result.current).toEqual('#anchor');
  });
});
