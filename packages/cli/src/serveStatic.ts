#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';

export default function serveStatic(staticPath, rootURL = 'mosaic/index.html', port = 3000) {
  function loadPage(res, fullPath) {
    const extension = path.extname(fullPath) || 'html';
    if (extension !== 'html') {
      return;
    }
    const fsPath = `${fullPath}.${extension}`;
    fs.access(fsPath, fs.constants.F_OK, err => {
      if (err) {
        res.sendFile(path.join(staticPath, `404.html`));
      } else {
        res.sendFile(fsPath);
      }
    });
  }

  const server = express();
  server.use(express.static(staticPath));
  server.get(/^\/$/, (_req, res) => {
    loadPage(res, path.join(staticPath, rootURL));
  });
  server.get(`*`, (req, res) => {
    loadPage(res, path.join(staticPath, req.path));
  });
  server.listen(port, () => console.log(`Server is listening on port ${port}`));
}
