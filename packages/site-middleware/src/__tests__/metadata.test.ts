import { expect, test } from 'vitest';
import type { ResolvedContent } from '../resolveContent.js';
import { buildMosaicMetadata } from '../metadata.js';

const document = (frontmatter: Record<string, unknown>): ResolvedContent => ({
  kind: 'mdx',
  originalPathname: '/alias',
  pathname: '/docs/index',
  sourcePathname: '/docs/index.mdx',
  mdx: { kind: 'mdx', raw: '', frontmatter },
  sharedConfig: undefined
});

test('builds document metadata from the resolved alias target without host branding', () => {
  expect(
    buildMosaicMetadata(
      document({
        route: '/public/index',
        title: 'Page',
        description: 'Description',
        lastModified: 42,
        breadcrumbs: [{ label: 'Docs' }],
        image: '/brand.png'
      })
    )
  ).toEqual({
    title: 'Page',
    description: 'Description',
    alternates: { canonical: '/public/index' },
    other: { lastModified: '42', breadcrumbs: '[{"label":"Docs"}]' }
  });
});

test('ignores malformed fields and keeps the existing canonical fallback validation', () => {
  expect(
    buildMosaicMetadata(
      document({
        route: '//outside',
        title: [],
        description: {},
        lastModified: false,
        breadcrumbs: {}
      })
    )
  ).toEqual({ alternates: { canonical: '/docs/index' } });
  expect(buildMosaicMetadata(document({ title: '', description: '', breadcrumbs: [] }))).toEqual({
    alternates: { canonical: '/docs/index' }
  });
});

test('returns empty metadata for missing and redirected content', () => {
  expect(buildMosaicMetadata({ kind: 'redirect', destination: '/elsewhere' })).toEqual({});
  expect(
    buildMosaicMetadata({
      kind: 'not-found',
      pathname: '/missing',
      originalPathname: '/missing',
      sharedConfig: undefined
    })
  ).toEqual({});
});
