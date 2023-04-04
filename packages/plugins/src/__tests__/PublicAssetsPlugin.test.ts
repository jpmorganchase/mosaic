import PublicAssetsPlugin from '../PublicAssetsPlugin';
import { createFsFromVolume, Volume } from 'memfs';
import fs from 'node:fs';
import path from 'node:path';

jest.mock('node:fs', () => ({
  promises: {
    writeFile: jest.fn()
  }
}));

const vol = Volume.fromJSON({
  '/sitemap.xml': 'sitemap content.',
  '/some-other-file.mdx': 'mdx content'
});

const sharedFilesystem = createFsFromVolume(vol);
sharedFilesystem.promises.glob = jest.fn().mockResolvedValue(['/sitemap.xml']);

describe('GIVEN the PublicAssetsPlugin', () => {
  test('THEN it should use the `afterUpdate` lifecycle event', () => {
    expect(PublicAssetsPlugin).toHaveProperty('afterUpdate');
  });

  describe('AND WHEN assets are found', () => {
    beforeEach(() => {
      sharedFilesystem.promises.glob = jest.fn().mockResolvedValue(['/sitemap.xml']);
    });
    test('THEN the assets are copied to the output directory', async () => {
      await PublicAssetsPlugin?.afterUpdate(vol, { sharedFilesystem }, { assets: ['sitemap.xml'] });

      expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
      expect(fs.promises.writeFile.mock.calls[0][0]).toEqual(path.resolve('./public/sitemap.xml'));
    });
  });

  describe('AND WHEN assets are **NOT** found', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });
    test('THEN nothing is copied', async () => {
      await PublicAssetsPlugin?.afterUpdate(vol, { sharedFilesystem }, { assets: ['unknown.xml'] });

      expect(fs.promises.writeFile).toHaveBeenCalledTimes(0);
    });
  });

  describe('AND WHEN the output directory is changed', () => {
    beforeEach(() => {
      jest.resetAllMocks();
      sharedFilesystem.promises.glob = jest.fn().mockResolvedValue(['/sitemap.xml']);
    });
    test('THEN the provided output directory is used', async () => {
      await PublicAssetsPlugin?.afterUpdate(
        vol,
        { sharedFilesystem },
        { assets: ['sitemap.xml'], outputDir: 'output' }
      );

      expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
      expect(fs.promises.writeFile.mock.calls[0][0]).toEqual(path.resolve('./output/sitemap.xml'));
    });
  });

  describe('AND WHEN no assets are provided', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });
    test('THEN nothing is copied', async () => {
      await PublicAssetsPlugin?.afterUpdate(vol, { sharedFilesystem }, { assets: [] });

      expect(fs.promises.writeFile).toHaveBeenCalledTimes(0);
    });
  });
});
