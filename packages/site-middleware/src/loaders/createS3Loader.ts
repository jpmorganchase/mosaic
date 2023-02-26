import md5 from 'md5';
import { GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { MetadataBearer } from '@aws-sdk/types';

export function createClient(region, accessKeyId, secretAccessKey): S3Client {
  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
}

async function readFile(client, bucket, key) {
  const params = {
    Bucket: bucket,
    Key: key
  };
  const command = new GetObjectCommand(params);
  const response = await client.send(command);
  return response;
}

const clientCache = {};
export function createS3Loader(region, accessKeyId, secretAccessKey) {
  const clientHash = md5(`${region}${accessKeyId}${secretAccessKey}`);
  if (!clientCache[clientHash]) {
    clientCache[clientHash] = createClient(region, accessKeyId, secretAccessKey);
  }
  const client = clientCache[clientHash];

  return {
    loadKey: async (bucket: string, key: string): Promise<string> => {
      const data = await readFile(client, bucket, key);
      const text = await data.Body.transformToString();
      return text;
    },
    keyExists: async (bucket: string, key: string): Promise<boolean> => {
      const params = {
        Bucket: bucket,
        Key: key
      };
      const command = new HeadObjectCommand(params);
      let exists = false;

      try {
        const response = await client.send(command);
        exists = response?.$metadata?.httpStatusCode === 200;
      } catch (error) {
        const bearer: MetadataBearer = error as MetadataBearer;
        if (bearer?.$metadata?.httpStatusCode === 404) {
          exists = false;
        } else {
          throw error;
        }
      }
      return !!exists;
    }
  };
}
