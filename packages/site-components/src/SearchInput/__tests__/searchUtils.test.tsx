import { calculateBestIndex, getBestMatch } from '../searchUtils';
import type { Index, Match } from '../searchUtils';

describe('GIVEN a list of search results', () => {
  describe('WHEN parsing match indices', () => {
    const matches: Match[] = [
      {
        indices: [
          [9, 11], // ∆ = 1
          [17, 21], // ∆ = 4
          [27, 29] // ∆ = 2
        ],
        key: 'content',
        value: 'blah blah TE blah TERM blah TE blah blah'
      },
      {
        indices: [
          [4, 6], // ∆ = 2
          [12, 14], // ∆ = 2
          [20, 23] // ∆ = 3
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
      expect(result.index).toEqual(indices[3]);
      expect(result.delta).toEqual(22);
    });

    test('AND the match with the largest index ∆ is chosen', () => {
      const result = getBestMatch([...matches]);
      expect(result).toEqual('blah blah TE blah TERM blah TE blah blah');
    });
  });
});
