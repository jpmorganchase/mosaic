import { describe, beforeAll, test, expect, afterAll } from 'vitest';
import { getSnapshotS3Config } from '../index.js';
describe('GIVEN getS3Config', () => {
  describe('WHEN valid config is defined', () => {
    let savedEnv = process.env;
    beforeAll(() => {
      process.env = {
        ...process.env,
        MOSAIC_S3_BUCKET: 'some-bucket',
        MOSAIC_S3_REGION: 'some-region',
        MOSAIC_S3_ACCESS_KEY_ID: 'some-access-key',
        MOSAIC_S3_SECRET_ACCESS_KEY: 'some-secret-key'
      };
    });
    afterAll(() => {
      process.env = savedEnv;
    });
    test('THEN it returns the S3 config', async () => {
      // arrange
      const config = getSnapshotS3Config('some-key');
      // assert
      expect(config).toEqual({
        bucket: 'some-bucket',
        region: 'some-region',
        accessKeyId: 'some-access-key',
        secretAccessKey: 'some-secret-key'
      });
    });
  });
  describe('WHEN invalid config is defined', () => {
    let savedEnv = process.env;
    beforeAll(() => {
      process.env = {};
    });
    afterAll(() => {
      process.env = savedEnv;
    });
    test('THEN it throws an error', () => {
      // assert
      expect(() => getSnapshotS3Config('some-key')).toThrow(
        /Environment variables missing for loading of S3 content for key some-key/
      );
    });
  });
});
