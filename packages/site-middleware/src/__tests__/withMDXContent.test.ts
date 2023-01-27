import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { sdkStreamMixin } from '@aws-sdk/util-stream-node';
import { Readable } from 'stream';
import { default as fetchMock, disableFetchMocks, enableFetchMocks } from 'jest-fetch-mock';

const mockFs = require('mock-fs');

import { withMDXContent } from '../withMDXContent';

jest.mock('../compileMdx.js', () => ({
  compileMDX: async value => Promise.resolve(value)
}));

describe('GIVEN withMDXContent', () => {
  describe('WHEN snapshot-s3 Mosaic mode is set', () => {
    let savedEnv = process.env;
    let s3ClientMock;
    beforeAll(() => {
      process.env = {
        ...process.env,
        MOSAIC_S3_BUCKET: 'some-bucket',
        MOSAIC_S3_REGION: 'some-region',
        MOSAIC_S3_ACCESS_KEY_ID: 'some-access-key',
        MOSAIC_S3_SECRET_ACCESS_KEY: 'some-secret-key'
      };
      s3ClientMock = mockClient(S3Client);
      const stream = new Readable();
      stream.push('my content');
      stream.push(null); // end of stream
      const contentStream = sdkStreamMixin(stream);
      s3ClientMock.on(GetObjectCommand).resolves({ Body: contentStream });
    });
    afterAll(() => {
      process.env = savedEnv;
      s3ClientMock.reset();
    });
    test('THEN a snapshot can be loaded from an S3 bucket', async () => {
      // arrange
      const content = await withMDXContent({
        resolvedUrl: '/mynamespace/mypage.mdx',
        res: { getHeader: () => 'snapshot-s3' }
      });
      // assert
      expect(content).toEqual({ props: { raw: 'my content', source: 'my content', type: 'mdx' } });
    });
  });

  describe('WHEN snapshot-file Mosaic mode is set', () => {
    let savedEnv = process.env;
    beforeAll(() => {
      process.env = { ...process.env, MOSAIC_SNAPSHOT_DIR: '/some/snapshots' };
      mockFs({
        'some/snapshots/mynamespace/mydir': {
          'mypage.mdx': 'my content'
        }
      });
    });
    afterAll(() => {
      mockFs.restore();
      process.env = savedEnv;
    });

    test('THEN a snapshot can be loaded from a local file', async () => {
      // arrange
      const content = await withMDXContent({
        resolvedUrl: '/mynamespace/mydir/mypage.mdx',
        res: { getHeader: () => 'snapshot-file' }
      });
      expect(content).toEqual({ props: { raw: 'my content', source: 'my content', type: 'mdx' } });
    });
  });

  describe('WHEN dynamic Mosaic mode is set', () => {
    beforeAll(() => {
      enableFetchMocks();
      fetchMock.mockOnce('my content');
    });
    afterAll(() => {
      disableFetchMocks();
    });
    test('THEN content is fetched from the data source', async () => {
      // arrange
      const content = await withMDXContent({
        resolvedUrl: '/mynamespace/mypage.mdx',
        res: { getHeader: () => '/dynamic' }
      });
      // assert
      expect(content).toEqual({ props: { raw: 'my content', source: 'my content', type: 'mdx' } });
    });
  });
});
