import { describe, test, expect, beforeEach, vi } from 'vitest';
import { fs, vol } from 'memfs';
import path from 'path';
import { ThumbnailCache } from '../utils/thumbnailCache.js';

vi.mock(import('fs'), async () => {
  return { default: fs, existsSync: fs.existsSync, mkdirSync: fs.mkdirSync };
});

describe('ThumbnailCache with memfs', () => {
  const cacheDir = '/tmp/figma-cache';
  const ttl = 1000 * 60 * 60; // 1 hour
  const fileId = 'test-file';
  const cacheFilePath = path.join(cacheDir, `thumbnail-${fileId}.json`);
  const thumbnails = { node1: 'url1', node2: 'url2' };
  const fileLastModified = new Date().toISOString();

  beforeEach(() => {
    vol.reset();
  });

  test('creates cache directory if it does not exist', () => {
    expect(fs.existsSync(cacheDir)).toBe(false);
    new ThumbnailCache({ cacheDir, ttl });
    expect(fs.existsSync(cacheDir)).toBe(true);
  });

  test('does not create cache directory if it exists', () => {
    fs.mkdirSync(cacheDir, { recursive: true });
    expect(fs.existsSync(cacheDir)).toBe(true);
    new ThumbnailCache({ cacheDir, ttl });
    expect(fs.existsSync(cacheDir)).toBe(true);
  });

  test('stores thumbnails in cache', () => {
    const cache = new ThumbnailCache({ cacheDir, ttl });
    cache.storeThumbnails(fileId, thumbnails, fileLastModified);
    expect(fs.existsSync(cacheFilePath)).toBe(true);
    const content = fs.readFileSync(cacheFilePath, 'utf8');
    expect(content).toContain('"node1":"url1"');
  });

  test('returns null if cache file does not exist', () => {
    const cache = new ThumbnailCache({ cacheDir, ttl });
    expect(cache.getThumbnails(fileId)).toBeNull();
  });

  test('returns thumbnails if cache is valid', () => {
    const cache = new ThumbnailCache({ cacheDir, ttl });
    cache.storeThumbnails(fileId, thumbnails, fileLastModified);
    expect(cache.getThumbnails(fileId, fileLastModified)).toEqual(thumbnails);
  });

  test('removes cache file if invalid and returns null', () => {
    const cache = new ThumbnailCache({ cacheDir, ttl });
    cache.storeThumbnails(fileId, thumbnails, fileLastModified);

    const cacheEntry = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
    cacheEntry.cachedAt = Date.now() - ttl - 1;
    fs.writeFileSync(cacheFilePath, JSON.stringify(cacheEntry));

    expect(cache.getThumbnails(fileId, fileLastModified)).toBeNull();
  });

  test('handles corrupted cache file gracefully', () => {
    const cache = new ThumbnailCache({ cacheDir, ttl });
    fs.writeFileSync(cacheFilePath, 'not-json');
    expect(cache.getThumbnails(fileId, fileLastModified)).toBeNull();
  });

  test('invalidates cache if fileLastModified is newer than cached', () => {
    const cache = new ThumbnailCache({ cacheDir, ttl });
    const oldDate = new Date(Date.now() - 100000).toISOString();
    cache.storeThumbnails(fileId, thumbnails, oldDate);
    expect(cache.getThumbnails(fileId, new Date().toISOString())).toBeNull();
    expect(fs.existsSync(cacheFilePath)).toBe(false);
  });
});
