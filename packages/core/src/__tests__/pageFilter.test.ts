import { describe, expect, test } from 'vitest';
import { createPageTest as corePageTest } from '../helpers/createPageTest.js';
import { createPageTest as pluginPageTest } from '../../../plugins/src/utils/createPageTest.js';

describe.each([
  ['core', corePageTest],
  ['plugins', pluginPageTest]
] as const)('%s page filtering', (_, createPageTest) => {
  test('accepts normal pages with the default empty ignore list', () => {
    const accepts = createPageTest([], ['.mdx', '.json']);
    expect(accepts('/docs/page.mdx')).toBe(true);
    expect(accepts('/docs/data.json')).toBe(true);
    expect(accepts('/docs/.hidden.mdx')).toBe(false);
    expect(accepts('/docs/page.mdx.backup')).toBe(false);
    expect(accepts('/docs/page.txt')).toBe(false);
    expect(createPageTest([], [])('/docs/page.mdx')).toBe(false);
  });

  test('matches every ignore and extension as a literal suffix', () => {
    const accepts = createPageTest(['skip.mdx', 'skip[1].mdx'], ['.mdx', '.json']);
    expect(accepts('/skip.mdx/page.mdx')).toBe(true);
    expect(accepts('/docs/skip.mdx')).toBe(false);
    expect(accepts('/docs/skip[1].mdx')).toBe(false);
    expect(accepts('/docs/skip1.mdx')).toBe(true);
    expect(accepts('/docs/pagemdx')).toBe(false);
  });
});
