import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const send = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(function S3ClientMock() {
    return { send };
  }),
  CreateBucketCommand: vi.fn().mockImplementation(function CreateBucketCommandMock(input) {
    return { kind: 'create', input };
  }),
  PutObjectCommand: vi.fn().mockImplementation(function PutObjectCommandMock(input) {
    return { kind: 'put', input };
  })
}));

const { default: uploadS3Snapshot } = await import('../upload-s3-snapshot.js');

let snapshotDir: string;

beforeEach(async () => {
  vi.stubEnv('MOSAIC_S3_BUCKET', 'bucket');
  vi.stubEnv('MOSAIC_S3_REGION', 'eu-west-2');
  vi.stubEnv('MOSAIC_S3_ACCESS_KEY_ID', 'id');
  vi.stubEnv('MOSAIC_S3_SECRET_ACCESS_KEY', 'secret');
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  snapshotDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mosaic-upload-'));
  await fs.promises.mkdir(path.join(snapshotDir, 'mosaic', 'docs'), { recursive: true });
  await fs.promises.writeFile(path.join(snapshotDir, 'mosaic', 'docs', 'index.mdx'), '# Docs');
  await fs.promises.writeFile(
    path.join(snapshotDir, 'mosaic', 'logo.png'),
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0xff, 0x00])
  );
});

afterEach(async () => {
  send.mockReset();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await fs.promises.rm(snapshotDir, { recursive: true, force: true });
});

function putCalls() {
  return send.mock.calls.map(([command]) => command).filter(command => command.kind === 'put');
}

describe('GIVEN uploadS3Snapshot', () => {
  test('THEN it resolves only after every file has been uploaded, byte for byte', async () => {
    send.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 5));
    });

    await uploadS3Snapshot(snapshotDir);

    const uploads = Object.fromEntries(putCalls().map(({ input }) => [input.Key, input.Body]));
    expect(Object.keys(uploads).sort()).toEqual(['mosaic/docs/index.mdx', 'mosaic/logo.png']);
    expect(
      Buffer.compare(uploads['mosaic/logo.png'], Buffer.from([0x89, 0x50, 0x4e, 0x47, 0xff, 0x00]))
    ).toBe(0);
  });

  test('THEN a failed upload rejects, after the other files are attempted', async () => {
    send.mockImplementation(async command => {
      if (command.kind === 'put' && command.input.Key === 'mosaic/logo.png') {
        throw new Error('access denied');
      }
    });

    await expect(uploadS3Snapshot(snapshotDir)).rejects.toThrow(
      'Failed to upload 1 of 2 files to bucket bucket: mosaic/logo.png'
    );
    expect(putCalls()).toHaveLength(2);
  });
});
