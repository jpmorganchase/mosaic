import { afterEach, describe, expect, test } from 'vitest';
import { parseFrontmatter, stringifyFrontmatter } from '../frontmatter.js';

describe('GIVEN parseFrontmatter', () => {
  test('THEN it parses YAML front matter and the content after it', () => {
    expect(parseFrontmatter('---\ntitle: Hello\ntags:\n  - a\n---\n# Body\n')).toEqual({
      data: { title: 'Hello', tags: ['a'] },
      content: '# Body\n'
    });
  });

  test('THEN it accepts bytes, CRLF line endings, a BOM and a `yaml` language tag', () => {
    const expected = { data: { title: 'x' }, content: 'body' };
    expect(parseFrontmatter(new TextEncoder().encode('---\ntitle: x\n---\nbody'))).toEqual(
      expected
    );
    expect(parseFrontmatter('---\r\ntitle: x\r\n---\r\nbody')).toEqual(expected);
    expect(parseFrontmatter('\uFEFF---\ntitle: x\n---\nbody')).toEqual(expected);
    expect(parseFrontmatter('---yaml\ntitle: x\n---\nbody')).toEqual(expected);
    expect(parseFrontmatter('---YML \ntitle: x\n---\nbody')).toEqual(expected);
  });

  test('THEN content without an opening fence is returned unchanged', () => {
    expect(parseFrontmatter('# Title\n')).toEqual({ data: {}, content: '# Title\n' });
    expect(parseFrontmatter('----\ntitle: x\n----\n')).toEqual({
      data: {},
      content: '----\ntitle: x\n----\n'
    });
    expect(parseFrontmatter('')).toEqual({ data: {}, content: '' });
  });

  test('THEN empty, comment-only and null blocks give empty data', () => {
    expect(parseFrontmatter('---\n---\nbody')).toEqual({ data: {}, content: 'body' });
    expect(parseFrontmatter('---\n# just a comment\n---\nbody')).toEqual({
      data: {},
      content: 'body'
    });
    expect(parseFrontmatter('---\n~\n---\nbody')).toEqual({ data: {}, content: 'body' });
  });

  test('THEN YAML 1.1 timestamps are parsed as dates', () => {
    expect(parseFrontmatter('---\nupdated: 2024-01-02\n---\n').data.updated).toEqual(
      new Date('2024-01-02T00:00:00Z')
    );
  });

  describe('WHEN the front matter declares a non-YAML language', () => {
    afterEach(() => {
      delete (globalThis as { __frontmatterEvaluated?: boolean }).__frontmatterEvaluated;
    });

    test.each(['js', 'javascript', 'JS', 'coffee', 'json'])(
      'THEN `---%s` is rejected without being evaluated',
      language => {
        expect(() =>
          parseFrontmatter(
            `---${language}\n({ title: (globalThis.__frontmatterEvaluated = true) })\n---\nbody`
          )
        ).toThrow(`Unsupported front matter language '${language}'`);
        expect(
          (globalThis as { __frontmatterEvaluated?: boolean }).__frontmatterEvaluated
        ).toBeUndefined();
      }
    );
  });
});

describe('GIVEN stringifyFrontmatter', () => {
  test('THEN it writes fenced YAML followed by the content', () => {
    expect(stringifyFrontmatter('# Body\n', { title: 'Hello', order: 1 })).toBe(
      '---\ntitle: Hello\norder: 1\n---\n# Body\n'
    );
  });

  test('THEN it omits the fences when there is no data and ends with a newline', () => {
    expect(stringifyFrontmatter('body', {})).toBe('body\n');
    expect(stringifyFrontmatter('', { title: 'x' })).toBe('---\ntitle: x\n---\n\n');
  });

  test('THEN parsing its output returns the same data and content', () => {
    const data = { title: 'Round trip', nested: { list: [1, 'two'], flag: true } };
    expect(parseFrontmatter(stringifyFrontmatter('Some *MDX*\n', data))).toEqual({
      data,
      content: 'Some *MDX*\n'
    });
  });
});
