import { withSnapshotS3 } from '../withSnapshotS3';

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { sdkStreamMixin } from '@aws-sdk/util-stream-node';
import { Readable } from 'stream';

jest.mock('../compileMdx.js', () => ({
  compileMDX: async value => Promise.resolve(value)
}));

describe('GIVEN withSnapshotS3', () => {
  const s3ClientMock = mockClient(S3Client);

  test('does not run when Mosaic mode is not snapshot-s3', async () => {
    const content = await withSnapshotS3(
      { resolvedUrl: '/mynamespace/mypage.mdx', res: { getHeader: () => 'dynamic' } },
      {
        bucket: 'someBucket',
        region: 'someRegion',
        accessKeyId: 'someAccessKeyId',
        secretAccessKey: 'someSecretAccessKey'
      }
    );
    expect(content).toEqual({});
  });

  test('runs when Mosaic mode is snapshot-s3', async () => {
    const stream = new Readable();
    stream.push('my content');
    stream.push(null); // end of stream
    const contentStream = sdkStreamMixin(stream);
    s3ClientMock.on(GetObjectCommand).resolves({ Body: contentStream });

    const content = await withSnapshotS3(
      { resolvedUrl: '/mynamespace/mypage.mdx', res: { getHeader: () => 'snapshot-s3' } },
      {
        bucket: 'someBucket',
        region: 'someRegion',
        accessKeyId: 'someAccessKeyId',
        secretAccessKey: 'someSecretAccessKey'
      }
    );
    expect(content).toEqual({ props: { raw: 'my content', source: 'my content', type: 'mdx' } });
  });
});
