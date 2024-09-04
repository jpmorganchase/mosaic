import { describe, expect, test } from 'vitest';
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
      document.body.innerHTML = `
            <h1 id="heading-1">Heading 1</h1>
            <h2 id="heading-2">Heading 2</h2>
            <h3 id="heading-3">Heading 3</h3>
          `;

      const result = setupHeadingState();

      expect(result).toEqual([
        {
          id: 'heading-1',
          level: 1,
          text: 'Heading 1',
          current: false
        },
        {
          id: 'heading-2',
          level: 2,
          text: 'Heading 2',
          current: false
        },
        {
          id: 'heading-3',
          level: 3,
          text: 'Heading 3',
          current: false
        }
      ]);
    });
    test('THEN the initial TOC selected state is created', () => {
      expect(setupSelectedHeadingState([{ slug: 'selected slug' }])).toEqual('selected slug');
      expect(setupSelectedHeadingState([])).toEqual('');
    });
  });

  describe('WHEN checking scroll position', () => {
    test('THEN the next (or last) anchor index is returned', () => {
      const positions = [10, 12, 20, 40, 60, 90];
      const zeroth = mostRecentScrollPoint(5, positions);
      const first = mostRecentScrollPoint(19, positions);
      const second = mostRecentScrollPoint(23, positions);
      const last = mostRecentScrollPoint(9999, positions);
      expect(zeroth).toBe(0);
      expect(first).toBe(2);
      expect(second).toBe(3);
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
