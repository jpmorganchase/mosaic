import { globby } from 'globby';
import path from 'path';
import fs from 'fs';
import { S3Client, CreateBucketCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import assert from 'assert';

const UPLOAD_CONCURRENCY = 8;

function createClient(region, accessKeyId, secretAccessKey): S3Client {
  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
}

export default async function uploadS3Snapshot(targetDir) {
  assert(
    process.env.MOSAIC_S3_BUCKET,
    'Cannot read S3 bucket - MOSAIC_S3_BUCKET environment var is missing'
  );
  assert(
    process.env.MOSAIC_S3_REGION,
    'Cannot read S3 bucket - MOSAIC_S3_REGION environment var is missing'
  );
  assert(
    process.env.MOSAIC_S3_ACCESS_KEY_ID,
    'Cannot read S3 bucket - MOSAIC_S3_ACCESS_KEY_ID environment var is missing'
  );
  assert(
    process.env.MOSAIC_S3_SECRET_ACCESS_KEY,
    'Cannot read S3 bucket - MOSAIC_S3_SECRET_ACCESS_KEY environment var is missing'
  );
  const bucket: string = process.env.MOSAIC_S3_BUCKET;
  const region: string = process.env.MOSAIC_S3_REGION;
  const accessKeyId: string = process.env.MOSAIC_S3_ACCESS_KEY_ID;
  const secretAccessKey: string = process.env.MOSAIC_S3_SECRET_ACCESS_KEY;

  const client = createClient(region, accessKeyId, secretAccessKey);
  await client.send(new CreateBucketCommand({ Bucket: bucket }));
  const paths = await globby(targetDir);
  const queue = [...paths];
  const failedKeys: string[] = [];
  const worker = async () => {
    for (let filePath = queue.shift(); filePath; filePath = queue.shift()) {
      const key = path.relative(targetDir, filePath).split(path.sep).join('/');
      try {
        console.log(`Upload ${key} to bucket ${bucket}`);
        // Read as a Buffer: decoding as utf-8 would corrupt binary files.
        const body = await fs.promises.readFile(filePath);
        await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body }));
      } catch (error) {
        console.error(`[Mosaic] Failed to upload ${key} to bucket ${bucket}`, error);
        failedKeys.push(key);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, queue.length) }, worker));

  if (failedKeys.length > 0) {
    const shown = failedKeys.slice(0, 10).join(', ');
    const more = failedKeys.length > 10 ? `, and ${failedKeys.length - 10} more` : '';
    throw new Error(
      `Failed to upload ${failedKeys.length} of ${paths.length} files to bucket ${bucket}: ${shown}${more}`
    );
  }
}
