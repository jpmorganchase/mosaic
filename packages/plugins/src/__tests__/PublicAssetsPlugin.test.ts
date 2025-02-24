import { describe, expect, test, beforeEach, vi } from 'vitest';
import PublicAssetsPlugin from '../PublicAssetsPlugin';
import { createFsFromVolume, Volume } from 'memfs';
import fs from 'node:fs';
import path from 'node:path';

vi.spyOn(fs.promises, 'writeFile').mockImplementation(vi.fn());

const vol = Volume.fromJSON({
  '/sitemap.xml': 'sitemap content.',
  '/some-other-file.mdx': 'mdx content'
});

const sharedFilesystem = createFsFromVolume(vol);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GIVEN the PublicAssetsPlugin', () => {
  test('THEN it should use the `afterUpdate` lifecycle event', () => {
    expect(PublicAssetsPlugin).toHaveProperty('afterUpdate');
  });

  describe('AND WHEN assets are found', () => {
    beforeEach(() => {
      sharedFilesystem.promises.glob = vi.fn().mockResolvedValue(['/sitemap.xml']);
    });
    test('THEN the assets are copied to the output directory', async () => {
      await PublicAssetsPlugin?.afterUpdate(vol, { sharedFilesystem }, { assets: ['sitemap.xml'] });

      expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
      expect(fs.promises.writeFile.mock.calls[0][0]).toEqual(
        path.posix.resolve('./public/sitemap.xml')
      );
    });
  });

  describe('AND WHEN assets are **NOT** found', () => {
    beforeEach(() => {
      sharedFilesystem.promises.glob = vi.fn().mockResolvedValue([]);
    });
    test('THEN nothing is copied', async () => {
      await PublicAssetsPlugin?.afterUpdate(vol, { sharedFilesystem }, { assets: ['unknown.xml'] });

      expect(fs.promises.writeFile).toHaveBeenCalledTimes(0);
    });
  });

  describe('AND WHEN the output directory is changed', () => {
    beforeEach(() => {
      sharedFilesystem.promises.glob = vi.fn().mockResolvedValue(['/sitemap.xml']);
    });
    test('THEN the provided output directory is used', async () => {
      await PublicAssetsPlugin?.afterUpdate(
        vol,
        { sharedFilesystem },
        { assets: ['sitemap.xml'], outputDir: 'output' }
      );

      expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
      expect(fs.promises.writeFile.mock.calls[0][0]).toEqual(
        path.posix.resolve('./output/sitemap.xml')
      );
    });
  });

  describe('AND WHEN no assets are provided', () => {
    test('THEN nothing is copied', async () => {
      await PublicAssetsPlugin?.afterUpdate(vol, { sharedFilesystem }, { assets: [] });

      expect(fs.promises.writeFile).toHaveBeenCalledTimes(0);
    });
  });
});
