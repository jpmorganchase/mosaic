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

test.each([
  ['/docs/guide#part?more', '/docs/guide#part?more.mdx', '/docs/guide%23part%3Fmore'],
  ['/docs/literal%20.mdx', '/docs/literal%20.mdx', '/docs/literal%2520.mdx'],
  ['/docs/release%20notes', '/docs/release%20notes.archive.mdx', '/docs/release%20notes'],
  ['/docs/custom%20route%23part', '/docs/backing.mdx', '/docs/custom%20route%23part'],
  ['/docs/%c3%89quipe', '/docs/team.mdx', '/docs/%C3%A9quipe']
])('publishes the canonical URL for %s', (route, fullPath, href) => {
  expect(buildMosaicMetadata(document({ route, fullPath })).alternates?.canonical).toBe(href);
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
