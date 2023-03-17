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

const config: SiteState['searchConfig'] = {
  includeScore: false,
  includeMatches: true,
  maxPatternLength: 240,
  ignoreLocation: true,
  threshold: 0.3,
  keys: ['title', 'content']
};

const state: Partial<SiteState> = {
  searchIndex: index,
  searchConfig: config
};

describe('GIVEN the useSearchIndex hook', () => {
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
    test('AND searchConfig is set to an empty object', () => {
      const { result } = renderHook(() => useSearchIndex(), {
        wrapper: createWrapper()
      });
      expect(typeof result.current.searchConfig).toBe('object');
      expect(Object.keys(result.current.searchConfig).length).toBe(0);
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
    test('AND searchIndex contains the search config', () => {
      const { result } = renderHook(() => useSearchIndex(), {
        wrapper: createWrapper({ ...state })
      });
      expect(typeof result.current.searchConfig).toBe('object');
      expect(Object.keys(result.current.searchConfig).length).toBe(Object.keys(config).length);
      expect(result.current.searchConfig.ignoreLocation).toBe(true);
      expect(result.current.searchConfig.maxPatternLength).toBe(240);
      expect(result.current.searchConfig.keys).toEqual(['title', 'content']);
    });
  });
});
