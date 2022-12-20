import { readFileSync } from 'fs';
import path from 'path';

export default function handler(req, res) {
  const mosaicSnapshotDir = process.env.MOSAIC_SNAPSHOT_DIR as string;
  const file = path.join(process.cwd(), mosaicSnapshotDir, 'mosaic', 'shared-config.json');
  res.setHeader('Content-Type', 'application/json');
  try {
    const stringified = readFileSync(file, 'utf8');
    return res.end(stringified);
  } catch (e) {
    return res.end({ file, e });
  }
}
