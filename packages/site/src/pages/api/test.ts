import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { promises as fs } from 'fs';

export default async function handler(_request: NextApiRequest, response: NextApiResponse) {
  const mosaicSnapshotDir = process.env.MOSAIC_SNAPSHOT_DIR || '';
  const rootDir = __dirname.split('.next')[0];
  const sharedConfigPath = path.join(
    rootDir,
    // 'public',
    mosaicSnapshotDir,
    'mosaic',
    'shared-config.json'
  );
  console.log('>> sharedConfigPath', sharedConfigPath);
  const fileContents = await fs.readFile(sharedConfigPath, 'utf8');
  response.status(200).json(fileContents);
}
