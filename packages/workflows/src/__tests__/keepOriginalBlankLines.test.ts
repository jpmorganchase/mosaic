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

  test('keeps a loose list loose when an item is removed', () => {
    expect(keepOriginalBlankLines('- a\n\n- b\n\n- c\n', '- a\n- c\n')).toBe('- a\n\n- c\n');
    // The items after it are renumbered.
    expect(keepOriginalBlankLines('1. a\n\n2. b\n\n3. c\n\n4. d\n', '1. a\n2. c\n3. d\n')).toBe(
      '1. a\n\n2. c\n\n3. d\n'
    );
  });

  test('keeps a loose list loose when an item is added', () => {
    expect(keepOriginalBlankLines('- a\n\n- b\n', '- a\n- new\n- b\n')).toBe(
      '- a\n\n- new\n\n- b\n'
    );
    expect(keepOriginalBlankLines('- a\n\n- b\n', '- a\n- b\n- c\n')).toBe('- a\n\n- b\n\n- c\n');
    expect(keepOriginalBlankLines('1. a\n\n2. b\n', '1. new\n2. a\n3. b\n')).toBe(
      '1. new\n\n2. a\n\n3. b\n'
    );
  });

  test('keeps a loose list loose when the editor changes its markers', () => {
    // The editor writes `-` bullets and `1.` numbers with one space.
    expect(keepOriginalBlankLines('* a\n\n* b\n\n* c\n', '- a\n- b\n- c\n')).toBe(
      '- a\n\n- b\n\n- c\n'
    );
    expect(keepOriginalBlankLines('* a\n\n* b\n\n* c\n', '- a\n- b\n- new\n- c\n')).toBe(
      '- a\n\n- b\n\n- new\n\n- c\n'
    );
    expect(keepOriginalBlankLines('* a\n\n* b\n\n* c\n', '- a\n- c\n')).toBe('- a\n\n- c\n');
    expect(keepOriginalBlankLines('+   a\n\n+   b\n', '- a\n- new\n- b\n')).toBe(
      '- a\n\n- new\n\n- b\n'
    );
    expect(keepOriginalBlankLines('1) a\n\n2) b\n', '1. a\n2. new\n3. b\n')).toBe(
      '1. a\n\n2. new\n\n3. b\n'
    );
    expect(keepOriginalBlankLines('* a\n* b\n', '- a\n- new\n- b\n')).toBe('- a\n- new\n- b\n');
    // Neighbouring lists the editor joins stay tight unless one was loose.
    expect(keepOriginalBlankLines('- a\n- b\n\n* c\n* d\n', '- a\n- b\n- c\n- d\n')).toBe(
      '- a\n- b\n- c\n- d\n'
    );
    expect(keepOriginalBlankLines('- a\n- b\n\n* c\n\n* d\n', '- a\n- b\n- c\n- d\n')).toBe(
      '- a\n- b\n\n- c\n\n- d\n'
    );
  });

  test('leaves tight and new lists tight', () => {
    expect(keepOriginalBlankLines('- a\n- b\n', '- a\n- new\n- b\n')).toBe('- a\n- new\n- b\n');
    expect(keepOriginalBlankLines('Intro\n\nOutro\n', 'Intro\n\n- x\n- y\n\nOutro\n')).toBe(
      'Intro\n\n- x\n- y\n\nOutro\n'
    );
    // A nested list is a list of its own.
    expect(keepOriginalBlankLines('- a\n\n  - n1\n  - n2\n', '- a\n  - n1\n  - n2\n  - n3\n')).toBe(
      '- a\n\n  - n1\n  - n2\n  - n3\n'
    );
  });

  test('keeps a nested list loose when the editor changes its indentation and adds an item', () => {
    const original = '- Parent\n  - First\n\n  - Last\n- Sibling\n';
    const saved = '- Parent\n    - First\n    - Added\n    - Last\n- Sibling\n';
    expect(keepOriginalBlankLines(original, saved)).toBe(
      '- Parent\n    - First\n\n    - Added\n\n    - Last\n- Sibling\n'
    );
  });

  test('keeps a new tight sublist tight when its items were formerly loose siblings', () => {
    const original = '- Parent\n\n- First\n\n- Last\n';
    const saved = '- Parent\n  - First\n  - Last\n';
    expect(keepOriginalBlankLines(original, saved)).toBe(saved);
  });

  test('keeps a list loose when the editor normalizes sibling indentation', () => {
    const original = '- First\n\n - Last\n';
    const saved = '- First\n- Last\n';
    expect(keepOriginalBlankLines(original, saved)).toBe('- First\n\n- Last\n');
    expect(keepOriginalBlankLines(original, '- First\n- Added\n- Last\n')).toBe(
      '- First\n\n- Added\n\n- Last\n'
    );
  });

  test("uses the saved page's spacing around removed lines outside a list", () => {
    expect(keepOriginalBlankLines('a\n\nb\nc\n', 'a\nc\n')).toBe('a\nc\n');
  });

  test('does not add blank lines the original did not have', () => {
    expect(keepOriginalBlankLines('- a\n- b\n', '- a\n- b\n')).toBe('- a\n- b\n');
  });

  test('keeps the blank lines the saved page has', () => {
    // The author split a paragraph where it was wrapped.
    expect(keepOriginalBlankLines('One\nTwo\n', 'One\n\nTwo\n')).toBe('One\n\nTwo\n');
  });

  test("uses the saved page's spacing outside lists", () => {
    // The author joined two paragraphs with a line break.
    expect(keepOriginalBlankLines('One\n\nTwo\n', 'One\nTwo\n')).toBe('One\nTwo\n');
    expect(keepOriginalBlankLines('# Title\n\nText\n', '# Title\nText\n')).toBe('# Title\nText\n');
    // A list ends at a line that isn't indented under it.
    expect(keepOriginalBlankLines('- a\n\nText\n', '- a\nText\n')).toBe('- a\nText\n');
  });

  test('keeps the blank lines in a list between lines of an item and the next', () => {
    const original = '- long item\n  continues here\n\n- b\n';
    expect(keepOriginalBlankLines(original, '- long item\n  continues here\n- b\n')).toBe(original);
    expect(keepOriginalBlankLines(original, '- long item\n  continues here\n- new\n- b\n')).toBe(
      '- long item\n  continues here\n\n- new\n\n- b\n'
    );
    expect(keepOriginalBlankLines('- a\n  - n\n\n- b\n', '- a\n  - n\n- b\n')).toBe(
      '- a\n  - n\n\n- b\n'
    );
    // A blank line in a nested list doesn't make the list around it loose.
    expect(
      keepOriginalBlankLines('- a\n  - n1\n\n  - n2\n- b\n', '- a\n  - n1\n  - n2\n- b\n- c\n')
    ).toBe('- a\n  - n1\n\n  - n2\n- b\n- c\n');
  });

  test('puts back the blank lines after the frontmatter', () => {
    const frontmatter = '---\ntitle: Page\n---\n';
    expect(keepOriginalBlankLines(`${frontmatter}\nBody\n`, `${frontmatter}Body\n`)).toBe(
      `${frontmatter}\nBody\n`
    );
    expect(keepOriginalBlankLines(`${frontmatter}\nBody\n`, `${frontmatter}New body\n`)).toBe(
      `${frontmatter}\nNew body\n`
    );
    expect(keepOriginalBlankLines(`${frontmatter}Body\n`, `${frontmatter}Body\n`)).toBe(
      `${frontmatter}Body\n`
    );
    expect(keepOriginalBlankLines('Body\n', `${frontmatter}Body\n`)).toBe(`${frontmatter}Body\n`);
  });

  test('leaves the frontmatter as it was saved', () => {
    const before = '---\ndescription: |-\n  First.\n\n  Second.\ntags:\n- a\n\n- b\n---\n\nBody\n';
    const after = '---\ndescription: |-\n  First.\n  Second.\ntags:\n- a\n- b\n---\n\nBody\n';
    expect(keepOriginalBlankLines(before, after)).toBe(after);
  });

  test('leaves fenced code as it was saved', () => {
    const tight = '```js\na();\nb();\n```\n';
    const spaced = '```js\na();\n\nb();\n```\n';
    expect(keepOriginalBlankLines(tight, spaced)).toBe(spaced);
    expect(keepOriginalBlankLines(spaced, tight)).toBe(tight);
    expect(keepOriginalBlankLines('~~~\n- a\n\n- b\n~~~\n', '~~~\n- a\n- b\n~~~\n')).toBe(
      '~~~\n- a\n- b\n~~~\n'
    );
    // After the code block, blank lines are restored again.
    expect(
      keepOriginalBlankLines(
        '````\n```\ncode\n````\n\n- a\n\n- b\n',
        '````\n```\ncode\n````\n\n- a\n- b\n'
      )
    ).toBe('````\n```\ncode\n````\n\n- a\n\n- b\n');
  });

  test('only ever changes blank lines', () => {
    const original = '# Title\n\n- a\n\n  - nested\n\n- b\n\nText\n';
    const saved = '# Title\n- a\n  - nested\n- b changed\nText\nMore\n';
    expect(nonBlankLines(keepOriginalBlankLines(original, saved))).toEqual(nonBlankLines(saved));
  });

  test('matches lines that differ only by trailing whitespace or a carriage return', () => {
    expect(keepOriginalBlankLines('- a  \r\n\r\n- b\r\n', '- a\n- b\n')).toBe('- a\n\n- b\n');
  });

  test("keeps the saved page's leading and trailing lines", () => {
    expect(keepOriginalBlankLines('\n\n- a\n\n- b', '- a\n- b\n')).toBe('- a\n\n- b\n');
    expect(keepOriginalBlankLines('- a\n', '')).toBe('');
  });
});
