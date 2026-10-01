import { describe, expect, test } from 'vitest';

import { omitKey, withoutFrontmatterKey } from '../sharedPageData';

describe('omitKey', () => {
  test('returns a copy without the key, and the same object when it is absent', () => {
    const record = { a: 1, b: 2 };
    expect(omitKey(record, 'a')).toEqual({ b: 2 });
    expect(record).toEqual({ a: 1, b: 2 });
    expect(omitKey(record, 'c')).toBe(record);
  });
});

describe('withoutFrontmatterKey', () => {
  test('removes the key from the frontmatter and its meta alias without mutating', () => {
    const frontmatter = { title: 'Page', sidebarData: [{ id: '/a' }] };
    const source = { compiledSource: 'code', frontmatter, scope: { meta: frontmatter, other: 1 } };

    const trimmed = withoutFrontmatterKey(source, 'sidebarData');

    expect(trimmed.frontmatter).toEqual({ title: 'Page' });
    // `meta` keeps pointing at the same object as `frontmatter`.
    expect(trimmed.scope.meta).toBe(trimmed.frontmatter);
    expect(trimmed.scope.other).toBe(1);
    expect(trimmed.compiledSource).toBe('code');
    expect(source.frontmatter).toBe(frontmatter);
    expect(frontmatter).toHaveProperty('sidebarData');
  });

  test('trims a separate meta object too', () => {
    const source = {
      frontmatter: { title: 'Page', sidebarData: [] },
      scope: { meta: { title: 'Page', sidebarData: [] } }
    };

    expect(withoutFrontmatterKey(source, 'sidebarData').scope.meta).toEqual({ title: 'Page' });
  });

  test('returns the source unchanged when the key is absent', () => {
    const source = { frontmatter: { title: 'Page' }, scope: {} };
    expect(withoutFrontmatterKey(source, 'sidebarData')).toBe(source);
  });
});
