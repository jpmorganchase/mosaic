import { describe, expect, test } from 'vitest';
import {
  mostRecentScrollPoint,
  stripMarkdownLinks,
  setupHeadingState,
  setupSelectedHeadingState
} from '../utils';

describe('GIVEN a Table Of Contents (TOC)', () => {
  test('legacy heading helpers remain available and select the generated id', () => {
    document.body.innerHTML = '<h2 id="section">Section</h2>';
    expect(setupSelectedHeadingState(setupHeadingState())).toBe('section');
    expect(setupSelectedHeadingState([])).toBe('');
  });
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

  describe('WHEN checking scroll position', () => {
    test('THEN the current section remains selected until the next heading is reached', () => {
      const positions = [10, 12, 20, 40, 60, 90];
      const zeroth = mostRecentScrollPoint(5, positions);
      const first = mostRecentScrollPoint(19, positions);
      const second = mostRecentScrollPoint(23, positions);
      const last = mostRecentScrollPoint(9999, positions);
      expect(zeroth).toBe(0);
      expect(first).toBe(1);
      expect(second).toBe(2);
      expect(last).toBe(5);
      expect(mostRecentScrollPoint(20, positions)).toBe(2);
    });
    test('THEN null is returned if there are no valid points', () => {
      const emptyPositions = [];
      const emptyResult = mostRecentScrollPoint(5, emptyPositions);
      expect(emptyResult).toBe(null);

      const invalidPositions = [null, Number.NaN, Number.POSITIVE_INFINITY];
      const invalidResult = mostRecentScrollPoint(5, invalidPositions);
      expect(invalidResult).toBe(null);
    });
    test('THEN zero positions and original indices survive missing headings', () => {
      expect(mostRecentScrollPoint(0, [0, 100])).toBe(0);
      expect(mostRecentScrollPoint(150, [null, 0, null, 100, 200])).toBe(3);
      expect(mostRecentScrollPoint(0, [null, 100, 200])).toBe(1);
    });
  });
});
