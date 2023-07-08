#!/usr/bin/env node
import path from 'node:path';
import express from 'express';

export default function serveStatic(staticPath, rootURL = 'mosaic/index.html', port = 3000) {
  const server = express();
  server.use(express.static(staticPath));
  server.get('*', (_req, res) => res.sendFile(path.join(staticPath, rootURL)));
  server.listen(port, () => console.log(`Server is listening on port ${port}`));
}
