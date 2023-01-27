import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { s3LoaderProcessEnvSchema } from '@jpmorganchase/mosaic-schemas';

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
  const env = s3LoaderProcessEnvSchema.safeParse(process.env);
  if (!env.success) {
    env.error.issues.forEach(issue => {
      console.error(
        `Missing process.env.${issue.path.join()} environment variable required to load S3 ${key}`
      );
    });
    throw new Error(`Environment variables missing for loading of S3 content for key ${key}`);
  }
  const {
    MOSAIC_S3_BUCKET: bucket,
    MOSAIC_S3_REGION: region,
    MOSAIC_S3_ACCESS_KEY_ID: accessKeyId,
    MOSAIC_S3_SECRET_ACCESS_KEY: secretAccessKey
  } = env.data;
  if (!client) {
    client = createClient(region, accessKeyId, secretAccessKey);
  }
  const data = await readFile(client, bucket, key);
  const text = await data.Body.transformToString();
  return text;
};
