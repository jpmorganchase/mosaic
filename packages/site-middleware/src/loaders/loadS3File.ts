import assert from 'assert';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

let client;

function createClient(region, accessKeyId, secretAccessKey): S3Client {
  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
}

export async function readFile(client, bucket, key) {
  const params = {
    Bucket: bucket,
    Key: key
  };
  const command = new GetObjectCommand(params);
  const response = await client.send(command);
  return response;
}

export const loadS3File = async (key: string): Promise<string> => {
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
  if (!client) {
    client = createClient(region, accessKeyId, secretAccessKey);
  }
  const data = await readFile(client, bucket, key);
  const text = await data.Body.transformToString();
  return text;
};
