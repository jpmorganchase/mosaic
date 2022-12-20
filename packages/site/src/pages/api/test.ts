import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { promises as fs } from 'fs';

export default async function handler(_request: NextApiRequest, response: NextApiResponse) {
  const mosaicSnapshotDir = process.env.MOSAIC_SNAPSHOT_DIR || '';
  const snapshotDir = path.join(process.cwd(), mosaicSnapshotDir, 'mosaic');
  path.resolve(snapshotDir);
  const fileContents = await fs.readFile(path.join(snapshotDir, 'shared-config.json'), 'utf8');
  response.status(200).json(fileContents);
}
