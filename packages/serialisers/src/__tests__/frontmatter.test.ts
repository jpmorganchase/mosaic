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

  test.each([
    ['018', '018'],
    ['-019', '-019'],
    ['012.34', '012.34'],
    ['012e+4', '012e+4'],
    ['0o17', '0o17'],
    ['010', 8],
    ['-010', -8],
    ['0b10_10', 10],
    ['0xA_B', 171],
    ['1_000', 1000],
    ['1_000.5', 1000.5],
    ['1:20', 80],
    ['-1:20.5', -80.5],
    ['0.125', 0.125],
    ['1.2e3', 1200],
    ['-0', 0],
    ['-0.0', -0],
    ['.inf', Infinity],
    ['-.inf', -Infinity],
    ['.nan', NaN]
  ])('THEN the legacy scalar %s keeps its value through a save', (scalar, value) => {
    const parsed = parseFrontmatter(`---\nvalue: ${scalar}\n---\nbody\n`);
    expect(parsed.data.value).toEqual(value);
    expect(parseFrontmatter(stringifyFrontmatter(parsed.content, parsed.data))).toEqual(parsed);
  });

  test('THEN numeric-looking strings and nested values survive a save', () => {
    const data = {
      version: '018',
      nested: { code: '010', duration: '1:20', list: ['1_000', '1:20.5', '0b10', 8] }
    };
    expect(parseFrontmatter(stringifyFrontmatter('body', data)).data).toEqual(data);
    expect(parseFrontmatter('---\nversion: 018\n---\nbody').data.version).toBe('018');
  });

  test.each(['!!js/function >\n  function () { return 1; }', '!!js/regexp /test/'])(
    'THEN unsafe YAML types remain unsupported: %s',
    scalar => {
      expect(() => parseFrontmatter(`---\nvalue: ${scalar}\n---\nbody`)).toThrow();
    }
  );

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
