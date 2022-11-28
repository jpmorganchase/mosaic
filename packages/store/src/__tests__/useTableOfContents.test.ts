import { renderHook } from '@testing-library/react-hooks';

import { createWrapper } from './test-utils/utils';
import { TableOfContentsItem, useTableOfContents } from '../useTableOfContents';

const tableOfContents: TableOfContentsItem[] = [
  { level: 2, id: 'what-is-analytics', text: 'What is Analytics' },
  { level: 2, id: 'what-is-our-goal', text: 'What is our goal?' },
  { level: 2, id: 'benefits-of-using-our-service', text: 'Benefits of using our Service' },
  { level: 2, id: 'useful-go-links', text: 'Useful Go links' }
];

describe('GIVEN the `useTableOfContents` hook', () => {
  describe('WHEN there is NO table of contents in the store', () => {
    test('THEN the hook returns an empty collection', () => {
      const { result } = renderHook(() => useTableOfContents(), {
        wrapper: createWrapper()
      });
      expect(result.current.tableOfContents).toEqual([]);
    });
  });

  describe('WHEN table of contents is in the store', () => {
    test('THEN the hook returns the tabel of contents', () => {
      const { result } = renderHook(() => useTableOfContents(), {
        wrapper: createWrapper({ tableOfContents })
      });
      expect(result.current.tableOfContents.length).toEqual(4);
    });
  });
});
