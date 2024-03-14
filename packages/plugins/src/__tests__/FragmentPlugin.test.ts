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
