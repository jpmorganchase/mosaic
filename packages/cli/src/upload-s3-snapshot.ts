import globby from 'globby';
import path from 'path';
import fs from 'fs';
import { S3Client, CreateBucketCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import assert from 'assert';

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
  paths.forEach(async filePath => {
    const key = filePath.replace(`${targetDir}${path.sep}`, '');
    console.log(`Upload ${key} to bucket ${bucket}`);
    const body = fs.readFileSync(filePath, { encoding: 'utf-8' });
    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body
    });
    await client.send(putCommand);
  });
}
