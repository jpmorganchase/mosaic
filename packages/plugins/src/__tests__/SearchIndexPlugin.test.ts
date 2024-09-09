import { describe, expect, beforeEach, test, vi } from 'vitest';
import { optimizeContentForSearch, parseKeys } from '../SearchIndexPlugin';

describe('GIVEN the SearchIndexPlugin', () => {
  beforeEach(async () => {
    console.error = vi.fn();
  });

  describe('AND WHEN `parseKeys` is called', () => {
    test('THEN it should set fallback keys when no keys are provided', () => {
      const keys = parseKeys();
      expect(keys.length).toBe(3);
      expect(keys[0]).toBe('title');
      expect(keys[1]).toBe('route');
      expect(keys[2]).toBe('content');
    });

    test('THEN it should add the user keys to the required keys', () => {
      const keys = parseKeys(['test_key_1', 'test_key_2']);
      expect(keys.length).toBe(4);
      expect(keys[0]).toBe('title');
      expect(keys[1]).toBe('route');
      expect(keys[2]).toBe('test_key_1');
      expect(keys[3]).toBe('test_key_2');
    });

    test('THEN it should return just the user keys when weights are included', () => {
      const keys = parseKeys([
        { key: 'test_key_1', weight: 0.1 },
        { key: 'test_key_2', weight: 1 }
      ]);
      expect(keys.length).toBe(2);
      expect(keys[0].key).toBe('test_key_1');
      expect(keys[0].weight).toBe(0.1);
      expect(keys[1].key).toBe('test_key_2');
      expect(keys[1].weight).toBe(1);
    });
  });

  describe('AND WHEN `optimizeContentForSearch` is called', () => {
    const simpleTextPage = {
      title: 'test_page_title',
      content:
        'Laboris aute ex nulla deserunt pariatur sit laboris in magna proident fugiat. Consequat qui ea laboris occaecat exercitation velit.\n\n## Sub heading\n\nId do labore incididunt enim ad sit irure anim excepteur. Voluptate reprehenderit tempor voluptate magna.\n\nVoluptate exercitation ipsum Lorem proident veniam non id. Proident aute quis commodo qui duis. Mollit commodo dolore laborum ad reprehenderit nisi qui. Dolore quis mollit cupidatat aliquip nostrud cillum labore ea labore in exercitation.'
    };

    test('THEN it should convert simple markdown content into sentences', async () => {
      const content = await optimizeContentForSearch(simpleTextPage);
      expect(content.length).toBe(9);
      expect(content[2]).toBe('Sub heading');
    });

    test('THEN it should apply max-line-length limits', async () => {
      const content = await optimizeContentForSearch({ ...simpleTextPage, maxLineLength: 50 });
      expect(content.length).toBe(9);
      expect(content[0].length).toBe(50);
    });

    test('THEN it should apply max-line-length limits', async () => {
      const content = await optimizeContentForSearch({ ...simpleTextPage, maxLineCount: 4 });
      expect(content.length).toBe(4);
    });

    test('THEN it should error on malformed markdown, and return an empty array', async () => {
      const content = await optimizeContentForSearch({
        content: 'Content with <half> a tag',
        title: 'page with broken content'
      });
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBe(0);
    });
  });
});
