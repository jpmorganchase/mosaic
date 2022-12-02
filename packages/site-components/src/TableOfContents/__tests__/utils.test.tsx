import {
  mostRecentScrollPoint,
  setupHeadingState,
  setupSelectedHeadingState,
  stripMarkdownLinks
} from '../utils';

describe('GIVEN a Table Of Contents (TOC)', () => {
  describe('WHEN parsing heading text', () => {
    test('THEN markdown links are removed', () => {
      // Removes markdown links
      const link = 'Some text [with some](/a-test-link) markdown.';
      expect(stripMarkdownLinks(link)).toBe('Some text with some markdown.');

      // Does not remove non-link square brackets
      const noLink = 'Some text [with some] markdown.';
      expect(noLink).toBe('Some text [with some] markdown.');

      // Does not remove non-parens square brackets
      const noParens = 'Some text with some() markdown.';
      expect(noParens).toBe('Some text with some() markdown.');
    });
  });

  describe('WHEN loading a new page', () => {
    test('THEN the initial TOC heading state is created', () => {
      expect(setupHeadingState([{ item: 1 }, { item: 2 }])).toEqual([
        { item: 1, current: false },
        { item: 2, current: false }
      ]);
    });
    test('THEN the initial TOC selected state is created', () => {
      expect(setupSelectedHeadingState([{ slug: 'selected slug' }])).toEqual('selected slug');
      expect(setupSelectedHeadingState([])).toEqual('');
    });
  });

  describe('WHEN checking scroll position', () => {
    test('THEN the closest anchor index is returned', () => {
      const positions = [10, 12, 20, 40, 60, 90];
      const zeroth = mostRecentScrollPoint(5, positions);
      const first = mostRecentScrollPoint(19, positions);
      const second = mostRecentScrollPoint(23, positions);
      const last = mostRecentScrollPoint(9999, positions);
      expect(zeroth).toBe(0);
      expect(first).toBe(1);
      expect(second).toBe(2);
      expect(last).toBe(5);
    });
    test('THEN null is returned if there are no valid points', () => {
      const emptyPositions = [];
      const emptyResult = mostRecentScrollPoint(5, emptyPositions);
      expect(emptyResult).toBe(null);

      const invalidPositions = ['SOMETHING_UNEXPECTED'];
      const invalidResult = mostRecentScrollPoint(5, invalidPositions);
      expect(invalidResult).toBe(null);
    });
  });
});
