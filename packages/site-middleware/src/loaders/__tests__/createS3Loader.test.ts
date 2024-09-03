import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { AwsStub, mockClient } from 'aws-sdk-client-mock';
import { sdkStreamMixin } from '@aws-sdk/util-stream';
import { Readable } from 'stream';

import { createS3Loader } from '../index.js';

describe('GIVEN createS3Loader', () => {
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
    stream.push('some-content');
    stream.push(null); // end of stream
    const contentStream = sdkStreamMixin(stream);
    s3ClientMock.on(GetObjectCommand).resolves({ Body: contentStream });
    s3ClientMock
      .on(HeadObjectCommand, {
        Bucket: 'some-bucket',
        Key: 'some-key'
      })
      .resolves({ $metadata: { httpStatusCode: 200 } });
    s3ClientMock
      .on(HeadObjectCommand, {
        Bucket: 'some-bucket',
        Key: 'non-existent-key'
      })
      .resolves({ $metadata: { httpStatusCode: 404 } });
  });
  afterAll(() => {
    process.env = savedEnv;
    s3ClientMock.reset();
  });
  test('THEN the S3 loader can load keys from buckets', async () => {
    // arrange
    const s3Client = createS3Loader('some-bucket', 'some-access-key', 'some-secret-key');
    // assert
    expect(await s3Client.loadKey('some-bucket', 'some-key')).toEqual('some-content');
  });
  test('THEN the S3 loader can check keys exist in buckets', async () => {
    // arrange
    const s3Client = createS3Loader('some-bucket', 'some-access-key', 'some-secret-key');
    // assert
    expect(await s3Client.keyExists('some-bucket', 'some-key')).toEqual(true);
    expect(await s3Client.keyExists('some-bucket', 'non-existent-key')).toEqual(false);
  });
});
