import { GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { AwsStub, mockClient } from 'aws-sdk-client-mock';
import { sdkStreamMixin } from '@aws-sdk/util-stream-node';
import { Readable } from 'stream';
import { default as fetchMock, disableFetchMocks, enableFetchMocks } from 'jest-fetch-mock';
const mockFs = require('mock-fs');

import { withSearchIndex } from '../withSearchIndex';

declare var process: {
  env: {
    MOSAIC_S3_BUCKET?: string;
    MOSAIC_S3_REGION?: string;
    MOSAIC_S3_ACCESS_KEY_ID?: string;
    MOSAIC_S3_SECRET_ACCESS_KEY?: string;
    MOSAIC_SNAPSHOT_DIR?: string;
  };
};

describe('GIVEN withSearchIndex', () => {
  describe('WHEN snapshot-s3 Mosaic mode is set', () => {
    let savedEnv = process.env;
    let s3ClientMock: AwsStub<{}, { $metadata: {} }>;
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
      stream.push('{ "someValue": true }');
      stream.push(null); // end of stream
      const contentStream = sdkStreamMixin(stream);
      s3ClientMock
        .on(GetObjectCommand, {
          Bucket: 'some-bucket',
          Key: 'search-data.json'
        })
        .resolves({ Body: contentStream });
      s3ClientMock
        .on(HeadObjectCommand, {
          Bucket: 'some-bucket',
          Key: 'search-data.json'
        })
        .resolves({ $metadata: { httpStatusCode: 200 } });
      s3ClientMock
        .on(HeadObjectCommand, {
          Bucket: 'some-bucket',
          Key: 'non-existent.json'
        })
        .resolves({ $metadata: { httpStatusCode: 404 } });
    });
    afterAll(() => {
      process.env = savedEnv;
      s3ClientMock.reset();
    });
    test('THEN search-index can be loaded from an S3 bucket', async () => {
      // arrange
      const content = await withSearchIndex({
        resolvedUrl: '/mynamespace/mypage.mdx',
        res: {
          getHeader: name => (name === 'X-Mosaic-Content-Url' ? '/mynamespace' : 'snapshot-s3')
        }
      });
      // assert
      expect(content).toEqual({ props: { searchIndex: { someValue: true } } });
    });
  });
  describe('WHEN snapshot-file Mosaic mode is set', () => {
    let savedEnv = process.env;
    beforeEach(() => {
      process.env = { MOSAIC_SNAPSHOT_DIR: '/some/snapshots' };
      mockFs({
        'some/snapshots/': {
          'search-data.json': '{ "someValue": true }'
        }
      });
    });
    afterEach(() => {
      mockFs.restore();
      process.env = savedEnv;
    });
    test('THEN reads search-index from a local file', async () => {
      // arrange
      const content = await withSearchIndex({
        resolvedUrl: '/mynamespace/mydir/mypage.mdx',
        res: {
          getHeader: name => (name === 'X-Mosaic-Content-Url' ? '/mydomain' : 'snapshot-file')
        }
      });
      expect(content).toEqual({ props: { searchIndex: { someValue: true } } });
    });
  });
  describe('WHEN active Mosaic mode is set', () => {
    beforeAll(() => {
      enableFetchMocks();
      fetchMock.mockResponses(
        [JSON.stringify({ someValue: true }), { status: 200 }],
        ['', { status: 404 }]
      );
    });
    afterAll(() => {
      disableFetchMocks();
    });
    test('THEN search-index is fetched from the data source', async () => {
      // arrange
      const content = await withSearchIndex({
        resolvedUrl: '/mynamespace/mypage.mdx',
        res: { getHeader: name => (name === 'X-Mosaic-Content-Url' ? '/mydomain' : 'active') }
      });
      // assert
      expect(content).toEqual({ props: { searchIndex: { someValue: true } } });
    });
    test('THEN does not throw for a non-existent search-index', async () => {
      // arrange
      const content = await withSearchIndex({
        resolvedUrl: '/mynamespace/non-existent/mypage.mdx',
        res: { getHeader: name => (name === 'X-Mosaic-Content-Url' ? '/mydomain' : 'active') }
      });
      // assert
      expect(content).toEqual({ props: {} });
    });
  });
});
