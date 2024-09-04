import { describe, test, expect } from 'vitest';
import { calculateBestIndex, getBestMatch, highlightMatch } from '../searchUtils';
import type { Index, Match } from '../searchUtils';

describe('GIVEN a list of search results', () => {
  describe('WHEN parsing match indices', () => {
    const matches: Match[] = [
      {
        indices: [
          [10, 11], // ∆ = 1
          [18, 21], // ∆ = 3
          [28, 29] // ∆ = 1
        ],
        key: 'content',
        value: 'blah blah TE blah TERM blah TE blah blah'
      },
      {
        indices: [
          [4, 5], // ∆ = 2
          [12, 13], // ∆ = 2
          [21, 23] // ∆ = 3
        ],
        key: 'content',
        value: 'blah TE blah TE blah TER blah.'
      }
    ];

    test('THEN the largest index is chosen', () => {
      const indices: Index[] = [
        [71, 78], // ∆ = 7
        [8, 13], // ∆ = 5
        [48, 50], // ∆ = 2
        [32, 54], // ∆ = 22 (This is the match with the largest ∆)
        [68, 69], // ∆ = 1
        [56, 57], // ∆ = 1
        [53, 54] // ∆ = 1
      ];
      const result = calculateBestIndex([...indices]);
      expect(result.index.length).toBe(2);
      expect(result.index).toEqual([32, 54]);
      expect(result.delta).toEqual(22);
    });

    test('AND the match with the largest index ∆ is chosen with highlighting applied', () => {
      const result = getBestMatch([...matches], 'FALLBACK');
      expect(result).toEqual('blah blah TE blah <strong>TERM</strong> blah TE blah blah');
    });

    test('AND matches from `title` and `route` are excluded to avoid duplication in the results display', () => {
      const matchesWithTitle = [{ ...matches[0], key: 'title' }, matches[1]];
      const result = getBestMatch([...matchesWithTitle], 'FALLBACK');
      expect(result).toEqual('blah TE blah TE blah <strong>TER</strong> blah.');
    });

    test('AND if there are no unique matches, then fallback content will be shown with no highlighting applied', () => {
      const matchesWithTitleAndRoute = [
        { ...matches[0], key: 'title' },
        { ...matches[1], key: 'route' }
      ];
      const result = getBestMatch([...matchesWithTitleAndRoute], 'FALLBACK');
      expect(result).toEqual('FALLBACK');
    });
  });

  describe('WHEN highlighting text', () => {
    const exampleText = 'lorem ipsum TARGET dolor sit amet';
    test('THEN a strong tag is wrapped around the target section', () => {
      const result = highlightMatch(exampleText, [12, 17]);
      expect(result).toEqual('lorem ipsum <strong>TARGET</strong> dolor sit amet');
    });
    test('AND handles overflowing indices', () => {
      const overflow = highlightMatch(exampleText, [12, 117]);
      expect(overflow).toEqual('lorem ipsum <strong>TARGET dolor sit amet</strong>');

      const underflow = highlightMatch(exampleText, [-12, 17]);
      expect(underflow).toEqual('<strong>lorem ipsum TARGET</strong> dolor sit amet');
    });

    test('AND returns the orginal text when provided a nonsensical index', () => {
      const positiveMiss = highlightMatch(exampleText, [112, 117]);
      expect(positiveMiss).toEqual(exampleText);

      const negativeMiss = highlightMatch(exampleText, [-12, -10]);
      expect(negativeMiss).toEqual(exampleText);
    });
  });
});
