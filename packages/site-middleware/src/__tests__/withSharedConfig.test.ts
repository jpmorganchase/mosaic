import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { AwsStub, mockClient } from 'aws-sdk-client-mock';
import { sdkStreamMixin } from '@aws-sdk/util-stream';
import { Readable } from 'stream';
import createFetchMock from 'vitest-fetch-mock';
import { vol, fs } from 'memfs';

import { withSharedConfig } from '../withSharedConfig';

const fetchMock = createFetchMock(vi);

declare var process: {
  env: {
    MOSAIC_S3_BUCKET?: string;
    MOSAIC_S3_REGION?: string;
    MOSAIC_S3_ACCESS_KEY_ID?: string;
    MOSAIC_S3_SECRET_ACCESS_KEY?: string;
    MOSAIC_SNAPSHOT_DIR?: string;
  };
};

describe('GIVEN withSharedConfig', () => {
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
      stream.push('{"config": { "someValue": true }}');
      stream.push(null); // end of stream
      const contentStream = sdkStreamMixin(stream);
      s3ClientMock
        .on(GetObjectCommand, {
          Bucket: 'some-bucket',
          Key: 'mynamespace/shared-config.json'
        })
        .resolves({ Body: contentStream });
      s3ClientMock
        .on(HeadObjectCommand, {
          Bucket: 'some-bucket',
          Key: 'mynamespace/shared-config.json'
        })
        .resolves({ $metadata: { httpStatusCode: 200 } });
      s3ClientMock
        .on(HeadObjectCommand, {
          Bucket: 'some-bucket',
          Key: 'non-existent/shared-config.json'
        })
        .resolves({ $metadata: { httpStatusCode: 404 } });
    });
    afterAll(() => {
      process.env = savedEnv;
      s3ClientMock.reset();
    });
    test('THEN shared-config can be loaded from an S3 bucket', async () => {
      // arrange
      const content = await withSharedConfig({
        resolvedUrl: '/mynamespace/mypage.mdx',
        res: {
          getHeader: name => (name === 'X-Mosaic-Content-Url' ? 'http://mydomain' : 'snapshot-s3')
        }
      });
      // assert
      expect(content).toEqual({ props: { sharedConfig: { someValue: true } } });
    });
    test('THEN does not throw for a non-existent shared-config', async () => {
      // arrange
      const content = await withSharedConfig({
        resolvedUrl: '/non-existent/mypage.mdx',
        res: {
          getHeader: name => (name === 'X-Mosaic-Content-Url' ? 'http://mydomain' : 'snapshot-s3')
        }
      });
      // assert
      expect(content).toEqual({ props: {} });
    });
  });

  describe('WHEN snapshot-file Mosaic mode is set', () => {
    let savedEnv = process.env;
    beforeEach(() => {
      process.env = { MOSAIC_SNAPSHOT_DIR: '/some/snapshots' };
      vol.fromNestedJSON({
        'some/snapshots/mynamespace/mydir': {
          'shared-config.json': '{"config": { "someValue": true }}'
        }
      });
      vi.mock('fs', () => ({ default: fs }));
    });
    afterEach(() => {
      vol.reset();
      process.env = savedEnv;
    });

    test('THEN reads shared-config from a local file', async () => {
      // arrange
      const content = await withSharedConfig({
        resolvedUrl: '/mynamespace/mydir/mypage.mdx',
        res: {
          getHeader: name => (name === 'X-Mosaic-Content-Url' ? 'http://mydomain' : 'snapshot-file')
        }
      });
      expect(content).toEqual({ props: { sharedConfig: { someValue: true } } });
    });
    test('THEN does not throw for a non-existent shared-config', async () => {
      // arrange
      const content = await withSharedConfig({
        resolvedUrl: '/mynamespace/non-existent/mypage.mdx',
        res: {
          getHeader: name => (name === 'X-Mosaic-Content-Url' ? 'http://mydomain' : 'snapshot-file')
        }
      });
      expect(content).toEqual({ props: {} });
    });
  });

  describe('WHEN active Mosaic mode is set', () => {
    beforeAll(() => {
      fetchMock.enableMocks();
      fetchMock.mockResponses(
        [JSON.stringify({ config: { someValue: true } }), { status: 200 }],
        ['', { status: 404 }]
      );
    });
    afterAll(() => {
      fetchMock.disableMocks();
    });
    test('THEN shared-config is fetched from the data source', async () => {
      // arrange
      const content = await withSharedConfig({
        resolvedUrl: '/mynamespace/mypage.mdx',
        res: { getHeader: name => (name === 'X-Mosaic-Content-Url' ? 'http://mydomain' : 'active') }
      });
      // assert
      expect(content).toEqual({ props: { sharedConfig: { someValue: true } } });
    });
    test('THEN does not throw for a non-existent shared-config', async () => {
      // arrange
      const content = await withSharedConfig({
        resolvedUrl: '/mynamespace/non-existent/mypage.mdx',
        res: { getHeader: name => (name === 'X-Mosaic-Content-Url' ? 'http://mydomain' : 'active') }
      });
      // assert
      expect(content).toEqual({ props: {} });
    });
  });
});
