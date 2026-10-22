import { describe, expect, test } from 'vitest';

import { findNewPageOwner } from '../findNewPageOwner';

const source = (prefixDir: string | undefined, workflows: string[] = ['save']) => ({
  prefixDir,
  hasWorkflow: (name: string) => workflows.includes(name)
});

describe('GIVEN findNewPageOwner', () => {
  const root = source('mosaic');
  const products = source('mosaic/products');

  test('THEN the source with the deepest prefixDir containing the page wins', () => {
    expect(findNewPageOwner([root, products], '/mosaic/products/new.mdx', 'save')).toBe(products);
    expect(findNewPageOwner([products, root], '/mosaic/products/new.mdx', 'save')).toBe(products);
    expect(findNewPageOwner([products, root], '/mosaic/new.mdx', 'save')).toBe(root);
  });

  test('THEN a source does not own pages in the parents of its prefixDir', () => {
    expect(findNewPageOwner([products], '/mosaic/new.mdx', 'save')).toBeUndefined();
    expect(findNewPageOwner([products], '/mosaic/productsX/new.mdx', 'save')).toBeUndefined();
  });

  test('THEN only sources with the workflow are considered', () => {
    const readOnly = source('mosaic/products', []);
    expect(findNewPageOwner([root, readOnly], '/mosaic/products/new.mdx', 'save')).toBe(root);
    expect(findNewPageOwner([readOnly], '/mosaic/products/new.mdx', 'save')).toBeUndefined();
  });

  test('THEN sources without a prefixDir are skipped and an empty one owns every page', () => {
    expect(findNewPageOwner([source(undefined)], '/new.mdx', 'save')).toBeUndefined();
    const everything = source('');
    expect(findNewPageOwner([everything, root], '/other/new.mdx', 'save')).toBe(everything);
    expect(findNewPageOwner([everything, root], '/mosaic/new.mdx', 'save')).toBe(root);
  });
});
