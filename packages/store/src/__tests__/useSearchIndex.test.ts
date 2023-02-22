import { renderHook } from '@testing-library/react';

import { createWrapper } from './test-utils/utils';
import { useSearchIndex } from '../useSearchIndex';
import { SiteState } from '../store';

const index: SiteState['searchIndex'] = [
  {
    title: 'Test item title',
    content: ['test item content sentence 1', 'test item content sentence 2'],
    route: 'test/page/route'
  },
  {
    title: 'Second test item title',
    content: [
      'Laborum deserunt laboris in quis dolor est laboris incididunt exercitation sunt voluptate.',
      'Nisi amet cupidatat ut laborum Lorem eu qui fugiat ad.'
    ],
    route: 'second/test/page/route'
  }
];

const state: Partial<SiteState> = {
  searchIndex: index
};

describe('GIVEN the `useSearchIndex` hook', () => {
  describe('WHEN there is no search index in the store', () => {
    test('THEN searchEnabled is set to false', () => {
      const { result } = renderHook(() => useSearchIndex(), {
        wrapper: createWrapper()
      });
      expect(result.current.searchEnabled).toBe(false);
    });
    test('AND searchIndex is set to an empty array', () => {
      const { result } = renderHook(() => useSearchIndex(), {
        wrapper: createWrapper()
      });
      expect(Array.isArray(result.current.searchIndex)).toBe(true);
      expect(result.current.searchIndex.length).toBe(0);
    });
  });

  describe('WHEN there is a search index in the store', () => {
    test('THEN searchEnabled is set to true', () => {
      const { result } = renderHook(() => useSearchIndex(), {
        wrapper: createWrapper({ ...state })
      });
      expect(result.current.searchEnabled).toBe(true);
    });
    test('AND searchIndex contains the index', () => {
      const { result } = renderHook(() => useSearchIndex(), {
        wrapper: createWrapper({ ...state })
      });
      expect(Array.isArray(result.current.searchIndex)).toBe(true);
      expect(result.current.searchIndex.length).toBe(index.length);
    });
  });
});
