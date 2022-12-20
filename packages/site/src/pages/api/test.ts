import { readFileSync } from 'fs';
import path from 'path';

export default function handler(req, res) {
  const mosaicSnapshotDir = process.env.MOSAIC_SNAPSHOT_DIR as string;
  // Find the absolute path for  the file/dir requested
  const file = path.join(process.cwd(), mosaicSnapshotDir, 'mosaic', 'shared-config.json');
  const stringified = readFileSync(file, 'utf8');

  res.setHeader('Content-Type', 'application/json');
  return res.end(stringified);
}
