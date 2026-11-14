import { describe, test, expect } from 'vitest';
import FragmentPlugin from '../FragmentPlugin.js';
import { Page } from '@jpmorganchase/mosaic-types';

const pages: Page[] = [
  {
    fullPath: '/fragment.mdx',
    route: 'route/fragment',
    title: 'Fragment',
    content: 'Fragment content.'
  },
  {
    fullPath: '/index.mdx',
    route: 'route/index',
    title: 'Index',
    content: ':fragment{src="./fragment.mdx"}'
  }
];

const invalidPages: Page[] = [
  {
    fullPath: '/fragment.mdx',
    route: 'route/fragment',
    title: 'Fragment',
    content: 'Fragment content.'
  },
  {
    fullPath: '/index.mdx',
    route: 'route/index',
    title: 'Index',
    content: ':fragment{}'
  }
];

describe('GIVEN the FragmentPlugin', () => {
  describe('AND WHEN fragments are found', () => {
    test('THEN the fragments are replaced', async () => {
      // @ts-expect-error
      const updatedPages = await FragmentPlugin?.$afterSource?.(pages, {
        pageExtensions: ['.mdx', '.json'],
        ignorePages: ['fake']
      });

      expect(updatedPages?.[0].content).toEqual(updatedPages?.[1].content);
    });
  });

  describe('AND WHEN fragments are invalid', () => {
    test('THEN plugin skips transforming the fragment', async () => {
      // @ts-expect-error
      const updatedPages = await FragmentPlugin?.$afterSource?.(invalidPages, {
        pageExtensions: ['.mdx', '.json'],
        ignorePages: ['fake']
      });

      expect(updatedPages?.[0].content).toEqual(updatedPages?.[0].content);
    });
  });
});

describe('GIVEN a page that cannot be parsed', () => {
  test('THEN the pages after it are still expanded AND the error names every failing page', async () => {
    const mixedPages: Page[] = [
      {
        fullPath: '/fragment.mdx',
        route: 'route/fragment',
        title: 'Fragment',
        content: 'Fragment content.'
      },
      { fullPath: '/broken.mdx', route: 'route/broken', title: 'Broken', content: '<Unclosed' },
      { fullPath: '/also-broken.mdx', route: 'route/also-broken', title: 'Also', content: '{' },
      {
        fullPath: '/index.mdx',
        route: 'route/index',
        title: 'Index',
        content: ':fragment{src="./fragment.mdx"}'
      }
    ];

    const run = FragmentPlugin.$afterSource!;
    const result = run(
      mixedPages,
      { pageExtensions: ['.mdx'], ignorePages: ['fake'] } as unknown as Parameters<typeof run>[1],
      {}
    );

    await expect(result).rejects.toMatchObject({
      name: 'PluginError',
      fullPath: '/broken.mdx',
      message: expect.stringMatching(
        /Unable to expand fragments in 2 page\(s\):\n {2}- \/broken\.mdx: .+\n {2}- \/also-broken\.mdx: .+/
      )
    });
    expect(mixedPages[3].content).toContain('Fragment content.');
    expect(mixedPages[1].content).toBe('<Unclosed');
  });
});
