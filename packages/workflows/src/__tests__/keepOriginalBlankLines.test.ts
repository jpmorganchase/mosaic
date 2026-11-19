import { describe, expect, test } from 'vitest';

import { keepOriginalBlankLines } from '../keepOriginalBlankLines.js';

const nonBlankLines = (page: string) => page.split('\n').filter(line => line.trim() !== '');

describe('keepOriginalBlankLines', () => {
  test('keeps the blank lines of a loose list the editor wrote tight', () => {
    const original = 'Intro\n\n- a\n\n- b\n\n- c\n';
    expect(keepOriginalBlankLines(original, 'Intro\n\n- a\n- b\n- c\n')).toBe(original);
  });

  test('treats a line edited in place as the same line', () => {
    const original = '- a\n\n- b\n\n- c\n';
    expect(keepOriginalBlankLines(original, '- a\n- B edited\n- c\n')).toBe(
      '- a\n\n- B edited\n\n- c\n'
    );
    expect(keepOriginalBlankLines(original, '- A\n- B\n- c\n')).toBe('- A\n\n- B\n\n- c\n');
  });

  test("uses the saved page's spacing where lines were removed", () => {
    expect(keepOriginalBlankLines('- a\n\n- b\n\n- c\n', '- a\n- c\n')).toBe('- a\n- c\n');
  });

  test("uses the saved page's spacing around an added line", () => {
    expect(keepOriginalBlankLines('- a\n\n- b\n', '- a\n- new\n- b\n')).toBe('- a\n- new\n- b\n');
  });

  test('does not add blank lines the original did not have', () => {
    expect(keepOriginalBlankLines('- a\n- b\n', '- a\n- b\n')).toBe('- a\n- b\n');
    expect(keepOriginalBlankLines('One\nTwo\n', 'One\n\nTwo\n')).toBe('One\nTwo\n');
  });

  test('only ever changes blank lines', () => {
    const original = '# Title\n\n- a\n\n  - nested\n\n- b\n\nText\n';
    const saved = '# Title\n- a\n  - nested\n- b changed\nText\nMore\n';
    expect(nonBlankLines(keepOriginalBlankLines(original, saved))).toEqual(nonBlankLines(saved));
  });

  test('matches lines that differ only by trailing whitespace or a carriage return', () => {
    expect(keepOriginalBlankLines('- a  \r\n\r\n- b\r\n', '- a\n- b\n')).toBe('- a\n\r\n- b\n');
  });

  test("keeps the saved page's leading and trailing lines", () => {
    expect(keepOriginalBlankLines('\n\n- a\n\n- b', '- a\n- b\n')).toBe('- a\n\n- b\n');
    expect(keepOriginalBlankLines('- a\n', '')).toBe('');
  });
});
