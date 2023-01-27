import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { sdkStreamMixin } from '@aws-sdk/util-stream-node';
import { Readable } from 'stream';
const mockFs = require('mock-fs');

import { withMDXContent } from '../withMDXContent';

jest.mock('../compileMdx.js', () => ({
  compileMDX: async value => Promise.resolve(value)
}));

describe('GIVEN withMDXContent', () => {
  describe('GIVEN dynamic Mosaic mode', () => {
    let s3ClientMock;
    beforeAll(() => {
      s3ClientMock = mockClient(S3Client);
      const stream = new Readable();
      stream.push('my content');
      stream.push(null); // end of stream
      const contentStream = sdkStreamMixin(stream);
      s3ClientMock.on(GetObjectCommand).resolves({ Body: contentStream });
    });
    afterEach(() => {
      s3ClientMock.reset();
    });
    test('runs when Mosaic mode is snapshot-s3', async () => {
      // arrange
      const content = await withMDXContent({
        resolvedUrl: '/mynamespace/mypage.mdx',
        res: { getHeader: () => 'snapshot-s3' }
      });
      // assert
      expect(content).toEqual({ props: { raw: 'my content', source: 'my content', type: 'mdx' } });
    });
  });
  describe('GIVEN dynamic Mosaic mode', () => {
    beforeAll(() => {
      fetchMock.mockOnce('my content');
    });
    test('runs when Mosaic mode is dynamic', async () => {
      // arrange
      const content = await withMDXContent({
        resolvedUrl: '/mynamespace/mypage.mdx',
        res: { getHeader: () => '/dynamic' }
      });
      // assert
      expect(content).toEqual({ props: { raw: 'my content', source: 'my content', type: 'mdx' } });
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
          'mypage.mdx': 'my content'
        }
      });
    });

    test.only('reads snapshots from a local file', async () => {
      // arrange
      process.env = { MOSAIC_SNAPSHOT_DIR: '/some/snapshots' };
      const content = await withMDXContent({
        resolvedUrl: '/mynamespace/mydir/mypage.mdx',
        res: { getHeader: () => 'snapshot-file' }
      });
      expect(content).toEqual({ props: { raw: 'my content', source: 'my content', type: 'mdx' } });
    });
  });
});
