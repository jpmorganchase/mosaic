import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import  fs  from 'fs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { route } = req.query;

  const test = route?.length ? [...route] : [route]
  
  const fileUrl = test.join( '/')
  // Use env: MOSAIC_SNAPSHOT_DIR="<folder-containing-mosaic-build-output>" for what data you want to serve
  const mosaicSnapshotDir = process.env.MOSAIC_SNAPSHOT_DIR || '';
  // Find the absolute path for  the file/dir requested
  const filePath = path.join(process.cwd(), mosaicSnapshotDir, fileUrl);
  
  try {
    const stats = fs.statSync(filePath);
    if (stats !== undefined) {
      if (stats.isDirectory()) {
        res.status(302).json({ redirect: `/${fileUrl}/index` });
      } else {
        const realPath = fs.realpathSync(filePath);
        if (path.extname(realPath) === '.json') {
          res.setHeader('Content-Type', 'application/json');
        } else if (path.extname(realPath) === '.mdx') {
          res.setHeader('Content-Type', 'text/mdx');
        } else if (path.extname(realPath) === '.xml') {
          res.setHeader('Content-Type', 'application/xml');
        }
        const data = fs.readFileSync(realPath, 'utf-8');
        res.status(200).send(data.toString());
      }
    } else {
      console.error(`[Mosaic] ${fileUrl} not found in static data... sending 404..\n`);
      res.status(404).end();
      return;
    }
  } catch (e) {
    console.error(`[Mosaic] ${fileUrl} :`, e);
    res.status(500).end();
  }
}
