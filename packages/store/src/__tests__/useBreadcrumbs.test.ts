import { renderHook } from '@testing-library/react';

import { createWrapper } from './test-utils/utils';
import { type Breadcrumb, useBreadcrumbs } from '../useBreadcrumbs';

const breadcrumbs: Breadcrumb[] = [
  { label: 'Home', path: '/home', hidden: false, id: '1' },
  { label: 'Docs', path: '/docs', hidden: false, id: '2' },
  { label: 'Products', path: '/products', hidden: false, id: '3' }
];

describe('GIVEN the `useBreadcrumbs` hook', () => {
  describe('WHEN there are NO breadcrumbs are in the store', () => {
    test('THEN the hook returns an empty collection', () => {
      const { result } = renderHook(() => useBreadcrumbs(), {
        wrapper: createWrapper()
      });
      expect(result.current.breadcrumbs).toEqual([]);
      expect(result.current.enabled).toEqual(false);
    });
  });

  describe('WHEN there are breadcrumbs are in the store', () => {
    test('THEN the hook returns those breadcrumbs', () => {
      const { result } = renderHook(() => useBreadcrumbs(), {
        wrapper: createWrapper({ breadcrumbs })
      });
      expect(result.current.breadcrumbs.length).toEqual(3);
      expect(result.current.enabled).toEqual(true);
    });
  });

  describe('WHEN there are breadcrumbs are in the store', () => {
    test('THEN enabled is false if there are not enough breadcrumbs', () => {
      const { result } = renderHook(() => useBreadcrumbs(10), {
        wrapper: createWrapper({ breadcrumbs })
      });
      expect(result.current.breadcrumbs.length).toEqual(3);
      expect(result.current.enabled).toEqual(false);
    });
  });
});
