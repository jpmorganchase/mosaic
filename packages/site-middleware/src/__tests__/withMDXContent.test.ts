import { describe, expect, test, vi, beforeAll, afterAll } from 'vitest';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { AwsStub, mockClient } from 'aws-sdk-client-mock';
import { sdkStreamMixin } from '@smithy/util-stream';
import { Readable } from 'stream';
import createFetchMock from 'vitest-fetch-mock';
import { fs, vol } from 'memfs';

import { withMDXContent } from '../withMDXContent';

const fetchMock = createFetchMock(vi);

vi.mock('fs', () => ({
  default: fs
}));
vi.mock('fs/promises', () => ({
  default: fs.promises
}));

vi.mock('../compileMdx.js', () => ({
  compileMDX: async (value: string) => Promise.resolve(value)
}));

declare var process: {
  env: {
    MOSAIC_S3_BUCKET?: string;
    MOSAIC_S3_REGION?: string;
    MOSAIC_S3_ACCESS_KEY_ID?: string;
    MOSAIC_S3_SECRET_ACCESS_KEY?: string;
    MOSAIC_SNAPSHOT_DIR?: string;
  };
};

describe('GIVEN withMDXContent', () => {
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
      vol.fromNestedJSON({
        'some/snapshots/mynamespace/mydir': {
          'mypage.mdx': 'my content'
        }
      });
    });
    afterAll(() => {
      vol.reset();
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
      fetchMock.enableMocks();
      fetchMock.mockOnce('my content');
    });
    afterAll(() => {
      fetchMock.disableMocks();
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
