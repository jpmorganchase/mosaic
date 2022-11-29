import { renderHook } from '@testing-library/react-hooks';

import { createWrapper } from './test-utils/utils';
import { useMeta } from '../useMeta';
import { Breadcrumb } from '../types';

const breadcrumbs: Breadcrumb[] = [
  { label: 'Home', path: '/home', hidden: false, id: '1' },
  { label: 'Docs', path: '/docs', hidden: false, id: '2' },
  { label: 'Products', path: '/products', hidden: false, id: '3' }
];

describe('GIVEN the `useMeta` hook', () => {
  describe('WHEN there is no metadata in the store', () => {
    test('THEN the hook returns no metadata', () => {
      const { result } = renderHook(() => useMeta(), {
        wrapper: createWrapper()
      });
      expect(result.current.meta.breadcrumbs).toEqual([]);
      expect(result.current.meta.description).toBeUndefined();
      expect(result.current.meta.title).toBeUndefined();
    });
  });

  describe('WHEN there is metadata in the store', () => {
    test('THEN the hook returns the metadata', () => {
      const { result } = renderHook(() => useMeta(), {
        wrapper: createWrapper({ breadcrumbs, title: 'A Title', description: 'A Description' })
      });
      expect(result.current.meta.breadcrumbs).toEqual(breadcrumbs);
      expect(result.current.meta.title).toEqual('A Title');
      expect(result.current.meta.description).toEqual('A Description');
    });
  });
});
