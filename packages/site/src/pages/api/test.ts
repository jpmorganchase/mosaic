export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const dir = process.env.MOSAIC_SNAPSHOT_DIR || 'env variable undefined';
    return res.end(dir);
  } catch (e) {
    return res.end('error');
  }
}
