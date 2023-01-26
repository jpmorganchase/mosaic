import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { sdkStreamMixin } from '@aws-sdk/util-stream-node';
import { Readable } from 'stream';
const mockFs = require('mock-fs');

import { withSharedConfig } from '../withSharedConfig';
describe('GIVEN withSharedConfig', () => {
  describe('GIVEN dynamic Mosaic mode', () => {
    beforeAll(() => {
      const s3ClientMock = mockClient(S3Client);
      const stream = new Readable();
      stream.push('{"config": { "someValue": true }}');
      stream.push(null); // end of stream
      const contentStream = sdkStreamMixin(stream);
      s3ClientMock.on(GetObjectCommand).resolves({ Body: contentStream });
    });
    test('runs when Mosaic mode is snapshot-s3', async () => {
      // arrange
      const content = await withSharedConfig({
        resolvedUrl: '/mynamespace/mypage.mdx',
        res: { getHeader: () => 'snapshot-s3' }
      });
      // assert
      expect(content).toEqual({ props: { sharedConfig: { someValue: true } } });
    });
  });
  describe('GIVEN dynamic Mosaic mode', () => {
    beforeAll(() => {
      fetchMock.mockOnce('{"config": { "someValue": true }}');
    });
    test('runs when Mosaic mode is dynamic', async () => {
      // arrange
      const content = await withSharedConfig({
        resolvedUrl: '/mynamespace/mypage.mdx',
        res: { getHeader: () => '/dynamic' }
      });
      // assert
      expect(content).toEqual({ props: { sharedConfig: { someValue: true } } });
    });
  });

  describe('GIVEN snapshot-file Mosaic mode', () => {
    let savedEnv = process.env;
    afterEach(() => {
      mockFs.restore();
      process.env = savedEnv;
    });
    beforeEach(() => {
      process.env = { MOSAIC_SNAPSHOT_DIR: '/some/snapshots' };
      mockFs({
        'some/snapshots/mynamespace/mydir': {
          'shared-config.json': '{"config": { "someValue": true }}'
        }
      });
    });

    test('reads snapshots from a local file', async () => {
      // arrange
      process.env = { MOSAIC_SNAPSHOT_DIR: '/some/snapshots' };
      const content = await withSharedConfig({
        resolvedUrl: '/mynamespace/mydir/mypage.mdx',
        res: { getHeader: () => 'snapshot-file' }
      });
      expect(content).toEqual({ props: { sharedConfig: { someValue: true } } });
    });
  });
});
